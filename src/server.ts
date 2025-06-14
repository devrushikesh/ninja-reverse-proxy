import { program } from "commander";
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import axios from 'axios';
import cluster, { Worker } from "node:cluster";
import { parseYAMLConfig, validateConfig } from './config';
import { WorkerMessageReplyType, WorkerMessageType } from "./server-schema";
import { configSchemaType } from "./config-schema";



class ConfigServer {


    async start(filepath: string) {
        if (cluster.isPrimary) {
            await this.startMaster(filepath);
        }
        else {
            await this.startWorker();
        }
    }

    private async startMaster(filepath: string) {
        if (!filepath) {
            console.log('Config file path is Required');
            process.exit(1)
        }
        const config = await this.loadConfig(filepath)
        const Worker_pool: Worker[] = []
        const worker_count = config.server.workers ?? os.cpus().length;

        for (let w = 0; w < worker_count; w++) {
            let worker = cluster.fork({
                ...process.env,
                CONFIG: JSON.stringify(config),
                WORKER_INDEX: String(w)
            })
            Worker_pool.push(worker)
            console.log('worker node is spinned up!');

        }

        const server = http.createServer((req, res) => {

            let body: any[] = []

            req.on('data', (chunk) => {
                body.push(chunk);
            })

            req.on('end', () => {
                const requestBody = Buffer.concat(body).toString()
                const index = Math.floor(Math.random() * worker_count);
                const worker: Worker = Worker_pool[index]
                const requestId = Date.now() + Math.random().toString(36).substring(2, 10);

                const payload: WorkerMessageType = {
                    requestId,
                    requestType: 'HTTPS',
                    method: (req.method && ['GET', 'POST', 'DELETE', 'PATCH'].includes(req.method)) ? req.method as 'GET' | 'POST' | 'DELETE' | 'PATCH' : 'GET',
                    headers: req.headers,
                    body: requestBody,
                    url: `${req.url}`
                }

                const messageHandler = (message: any) => {
                    try {

                        const workerReply: WorkerMessageReplyType = JSON.parse(message);
                        if (workerReply.requestId === requestId) {
                            // Remove the listener once we have the response
                            worker.removeListener('message', messageHandler);

                            // Send response back to client
                            res.writeHead(parseInt(workerReply.statusCode), workerReply.headers || {});
                            res.end(workerReply.data || workerReply.error || '');
                        }
                    } catch (error) {
                        console.error('Error processing worker response:', error);
                    }
                };

                worker.on('message', messageHandler);

                worker.send(JSON.stringify(payload))

            })

        })

        server.listen(config.server.listen, 'localhost', () => {
            console.log(`Reverse Proxy is running on port ${config.server.listen}`);
        })

    }


    private async startWorker() {
        console.log(`i am worker`);

        process.on('message', async (msg: string) => {

            const msgFromMaster: WorkerMessageType = JSON.parse(msg)

            // console.log("message from worker", msgFromMaster);
            

            const requestUrl = msgFromMaster['url']

            const upstream: any = await this.upsteamProvider(process.env.CONFIG as string, requestUrl)

            if (!upstream) {
                const replyPayload: WorkerMessageReplyType = {
                    requestId: msgFromMaster.requestId,
                    statusCode: '500',
                    error: "Path not found"
                }
                if (process.send) process.send(JSON.stringify(replyPayload))
                return
            }


            try {

                const upstreamUrl = new URL(upstream.url);
                const targetHost = upstreamUrl.host;
                
                // Create a copy of headers and modify the host
                const modifiedHeaders = { ...msgFromMaster.headers };
                modifiedHeaders.host = targetHost;

                const options = {
                    url: `${upstream.url}${requestUrl}`,
                    method: msgFromMaster.method,
                    headers: modifiedHeaders,
                    validateStatus: () => true,
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false // WARNING: This is insecure and only for development
                    })
                }


                const response = await axios.request(options)


                const replyPayload: WorkerMessageReplyType = {
                    headers: response.headers,
                    requestId: msgFromMaster.requestId,
                    statusCode: '200',
                    data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
                };

                if (process.send) process.send(JSON.stringify(replyPayload));

            } catch (error) {
                console.log(error);

                const replyPayload: WorkerMessageReplyType = {
                    requestId: msgFromMaster.requestId,
                    statusCode: '500',
                    error: `Upstream error: ${error}`
                };
                if (process.send) process.send(JSON.stringify(replyPayload));

            }



        })

    }

    private async upsteamProvider(config: string, requestUrl: string) {
        const configData: configSchemaType = JSON.parse(config);

        const rule = configData.server.rules.find(rule => rule.path === requestUrl);

        if (rule) {
            const upstream = configData.server.upstreams.find(up => up.id === rule.upstreams[0]);

            if (upstream) {
                return { url: upstream.url, path: requestUrl };
            }
        }

        return null;
    }



    private async loadConfig(filepath: string) {
        const validatedConfig = await validateConfig(await parseYAMLConfig(filepath));
        return validatedConfig;
    }

}



export default ConfigServer
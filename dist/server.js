"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_os_1 = __importDefault(require("node:os"));
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const axios_1 = __importDefault(require("axios"));
const node_cluster_1 = __importDefault(require("node:cluster"));
const config_1 = require("./config");
class ConfigServer {
    start(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (node_cluster_1.default.isPrimary) {
                yield this.startMaster(filepath);
            }
            else {
                yield this.startWorker();
            }
        });
    }
    startMaster(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!filepath) {
                console.log('Config file path is Required');
                process.exit(1);
            }
            const config = yield this.loadConfig(filepath);
            const Worker_pool = [];
            const worker_count = (_a = config.server.workers) !== null && _a !== void 0 ? _a : node_os_1.default.cpus().length;
            for (let w = 0; w < worker_count; w++) {
                let worker = node_cluster_1.default.fork(Object.assign(Object.assign({}, process.env), { CONFIG: JSON.stringify(config), WORKER_INDEX: String(w) }));
                Worker_pool.push(worker);
                console.log('worker node is spinned up!');
            }
            const server = node_http_1.default.createServer((req, res) => {
                let body = [];
                req.on('data', (chunk) => {
                    body.push(chunk);
                });
                req.on('end', () => {
                    const requestBody = Buffer.concat(body).toString();
                    const index = Math.floor(Math.random() * worker_count);
                    const worker = Worker_pool[index];
                    const requestId = Date.now() + Math.random().toString(36).substring(2, 10);
                    const payload = {
                        requestId,
                        requestType: 'HTTPS',
                        method: (req.method && ['GET', 'POST', 'DELETE', 'PATCH'].includes(req.method)) ? req.method : 'GET',
                        headers: req.headers,
                        body: requestBody,
                        url: `${req.url}`
                    };
                    const messageHandler = (message) => {
                        try {
                            const workerReply = JSON.parse(message);
                            if (workerReply.requestId === requestId) {
                                // Remove the listener once we have the response
                                worker.removeListener('message', messageHandler);
                                // Send response back to client
                                res.writeHead(parseInt(workerReply.statusCode), workerReply.headers || {});
                                res.end(workerReply.data || workerReply.error || '');
                            }
                        }
                        catch (error) {
                            console.error('Error processing worker response:', error);
                        }
                    };
                    worker.on('message', messageHandler);
                    worker.send(JSON.stringify(payload));
                });
            });
            server.listen(config.server.listen, 'localhost', () => {
                console.log(`Reverse Proxy is running on port ${config.server.listen}`);
            });
        });
    }
    startWorker() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`i am worker`);
            process.on('message', (msg) => __awaiter(this, void 0, void 0, function* () {
                const msgFromMaster = JSON.parse(msg);
                // console.log("message from worker", msgFromMaster);
                const requestUrl = msgFromMaster['url'];
                const upstream = yield this.upsteamProvider(process.env.CONFIG, requestUrl);
                if (!upstream) {
                    const replyPayload = {
                        requestId: msgFromMaster.requestId,
                        statusCode: '500',
                        error: "Path not found"
                    };
                    if (process.send)
                        process.send(JSON.stringify(replyPayload));
                    return;
                }
                try {
                    const upstreamUrl = new URL(upstream.url);
                    const targetHost = upstreamUrl.host;
                    // Create a copy of headers and modify the host
                    const modifiedHeaders = Object.assign({}, msgFromMaster.headers);
                    modifiedHeaders.host = targetHost;
                    const options = {
                        url: `${upstream.url}${requestUrl}`,
                        method: msgFromMaster.method,
                        headers: modifiedHeaders,
                        validateStatus: () => true,
                        httpsAgent: new node_https_1.default.Agent({
                            rejectUnauthorized: false // WARNING: This is insecure and only for development
                        })
                    };
                    const response = yield axios_1.default.request(options);
                    const replyPayload = {
                        headers: response.headers,
                        requestId: msgFromMaster.requestId,
                        statusCode: '200',
                        data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
                    };
                    if (process.send)
                        process.send(JSON.stringify(replyPayload));
                }
                catch (error) {
                    console.log(error);
                    const replyPayload = {
                        requestId: msgFromMaster.requestId,
                        statusCode: '500',
                        error: `Upstream error: ${error}`
                    };
                    if (process.send)
                        process.send(JSON.stringify(replyPayload));
                }
            }));
        });
    }
    upsteamProvider(config, requestUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const configData = JSON.parse(config);
            const rule = configData.server.rules.find(rule => rule.path === requestUrl);
            if (rule) {
                const upstream = configData.server.upstreams.find(up => up.id === rule.upstreams[0]);
                if (upstream) {
                    return { url: upstream.url, path: requestUrl };
                }
            }
            return null;
        });
    }
    loadConfig(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const validatedConfig = yield (0, config_1.validateConfig)(yield (0, config_1.parseYAMLConfig)(filepath));
            return validatedConfig;
        });
    }
}
exports.default = ConfigServer;

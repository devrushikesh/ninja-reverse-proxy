import { program } from "commander";
import Cluster from "node:cluster";
import { parseYAMLConfig, validateConfig } from './config'
import os from 'node:os'


interface CreateConfigServerInterface {
    port: number,
    worker_count: number
}


async function createConfigServer(config: CreateConfigServerInterface) {

    const { worker_count } = config;

    if (Cluster.isPrimary) {
        console.log('master process is running...');
        for (let i = 0; i < worker_count; i++) {
            Cluster.fork()
            console.log("worker process is spinned up ", i);
        }
    }
    else {
        console.log("i am worker process");
    }

}


async function main() {
    program.option('--config <char>');
    program.parse()

    const options = program.opts()
    if (options && 'config' in options) {
        
        const validatedConfig = await validateConfig(await parseYAMLConfig(options.config))
        createConfigServer({port: validatedConfig.server.listen, worker_count: validatedConfig.server.workers ?? os.cpus().length})
    }

}



main()
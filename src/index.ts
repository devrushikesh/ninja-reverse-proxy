import { program } from "commander";
import ConfigServer from "./server";


async function main() {
    program.requiredOption('--config <path>', 'path to config file').parse();

    const options = program.opts();
    if (options && 'config' in options) {
        const filepath = options.config;
        const server = new ConfigServer()
        await server.start(filepath)
    }
    else {
        throw new Error("Invalid options");
    }

}


main().catch(err => {
    console.error('Server failed:', err);
    process.exit(1);
});
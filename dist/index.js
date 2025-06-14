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
const commander_1 = require("commander");
const server_1 = __importDefault(require("./server"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.requiredOption('--config <path>', 'path to config file').parse();
        const options = commander_1.program.opts();
        if (options && 'config' in options) {
            const filepath = options.config;
            const server = new server_1.default();
            yield server.start(filepath);
        }
        else {
            throw new Error("Invalid options");
        }
    });
}
main().catch(err => {
    console.error('Server failed:', err);
    process.exit(1);
});

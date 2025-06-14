"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMessageReplySchema = exports.workerMessageSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.workerMessageSchema = zod_1.default.object({
    requestId: zod_1.default.string(),
    requestType: zod_1.default.enum(['HTTPS', 'HTTP']),
    method: zod_1.default.enum(['GET', 'POST', 'DELETE', 'PATCH']),
    headers: zod_1.default.any(),
    body: zod_1.default.any(),
    url: zod_1.default.string()
});
exports.workerMessageReplySchema = zod_1.default.object({
    headers: zod_1.default.any().optional(),
    requestId: zod_1.default.string(),
    data: zod_1.default.string().optional(),
    error: zod_1.default.string().optional(),
    statusCode: zod_1.default.enum(['404', '500', '200'])
});

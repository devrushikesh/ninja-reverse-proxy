"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootConfigSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const upstreamSchema = zod_1.default.object({
    id: zod_1.default.string(),
    url: zod_1.default.string().url()
});
const headerSchema = zod_1.default.object({
    key: zod_1.default.string(),
    value: zod_1.default.string()
});
const ruleSchema = zod_1.default.object({
    path: zod_1.default.string(),
    upstreams: zod_1.default.array(zod_1.default.string())
});
const serverSchema = zod_1.default.object({
    listen: zod_1.default.number(),
    workers: zod_1.default.number().optional(),
    upstreams: zod_1.default.array(upstreamSchema),
    headers: zod_1.default.array(headerSchema).optional(),
    rules: zod_1.default.array(ruleSchema)
});
exports.rootConfigSchema = zod_1.default.object({
    server: serverSchema
});

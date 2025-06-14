import z from 'zod';



export const workerMessageSchema = z.object({
    requestId: z.string(),
    requestType: z.enum(['HTTPS','HTTP']),
    method: z.enum(['GET','POST','DELETE','PATCH']),
    headers: z.any(),
    body: z.any(),
    url: z.string()
})


export const workerMessageReplySchema = z.object({
    headers: z.any().optional(),
    requestId: z.string(),
    data: z.string().optional(),
    error: z.string().optional(),
    statusCode: z.enum(['404','500','200'])
})

export type WorkerMessageType = z.infer<typeof workerMessageSchema>

export type WorkerMessageReplyType = z.infer<typeof workerMessageReplySchema>
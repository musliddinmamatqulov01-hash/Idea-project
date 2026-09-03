import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : nanoid();
    res.setHeader('x-request-id', req.id);
    next();
  }
}

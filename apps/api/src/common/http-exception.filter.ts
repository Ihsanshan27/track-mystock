import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { errorResponse } from './api-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? Array.isArray((payload as any).message)
            ? (payload as any).message.join(', ')
            : String((payload as any).message)
          : exception.message;

      response.status(status).json(errorResponse(`HTTP_${status}`, message, payload));
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse('INTERNAL_SERVER_ERROR', message),
    );
  }
}

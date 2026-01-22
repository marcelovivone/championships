import { transports, format } from 'winston';
import { WinstonModuleOptions } from 'nest-winston';

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.colorize({ all: true }),
        format.printf((info) => {
          const { timestamp, level, message, context, stack } = info;
          const contextMessage = context ? `[${context}]` : '';
          const stackMessage = stack ? `\n${stack}` : '';
          return `${timestamp} ${level}: ${contextMessage} ${message}${stackMessage}`;
        }),
      ),
    }),
  ],
};

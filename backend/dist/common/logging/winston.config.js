"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winstonConfig = void 0;
const winston_1 = require("winston");
exports.winstonConfig = {
    transports: [
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.colorize({ all: true }), winston_1.format.printf((info) => {
                const { timestamp, level, message, context, stack } = info;
                const contextMessage = context ? `[${context}]` : '';
                const stackMessage = stack ? `\n${stack}` : '';
                return `${timestamp} ${level}: ${contextMessage} ${message}${stackMessage}`;
            })),
        }),
    ],
};
//# sourceMappingURL=winston.config.js.map
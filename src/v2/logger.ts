import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS format
    const levelStr = LogLevel[level].padEnd(7);

    switch (level) {
      case LogLevel.DEBUG:
        return chalk.gray(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.INFO:
        return chalk.blue(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.WARN:
        return chalk.yellow(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.ERROR:
        return chalk.red(`[${timestamp}] ${levelStr} ${message}`);
      case LogLevel.SUCCESS:
        return chalk.green(`[${timestamp}] ${levelStr} ${message}`);
      default:
        return message;
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data
    };

    this.logs.push(entry);

    if (this.shouldLog(level)) {
      const formattedMessage = this.formatMessage(level, message);
      console.log(formattedMessage);

      if (data && level === LogLevel.DEBUG) {
        console.log(chalk.gray('  Data:'), data);
      }
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  success(message: string, data?: unknown): void {
    this.log(LogLevel.SUCCESS, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

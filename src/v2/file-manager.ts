import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from './logger.js';

// Get logger instance
const logger = Logger.getInstance();

export interface FileOperationResult {
    success: boolean;
    error?: string;
    data?: any;
}

export interface InsertOptions {
    content: string;
    marker?: string; // Text to search for as insertion point
    position?: 'before' | 'after' | 'replace';
    createIfNotExists?: boolean; // Create marker if it doesn't exist
}

export class FileManager {
    private static instance: FileManager;

    private constructor() {}

    static getInstance(): FileManager {
        if (!FileManager.instance) {
            FileManager.instance = new FileManager();
        }
        return FileManager.instance;
    }

    /**
     * Read a file and return its contents
     */
    async readFile(filePath: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);
            const content = await fs.readFile(absolutePath, 'utf-8');

            logger.debug(`Successfully read file: ${filePath}`);
            return {
                success: true,
                data: content
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to read file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Write content to a file (creates or overwrites)
     */
    async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);

            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(absolutePath));

            await fs.writeFile(absolutePath, content, 'utf-8');

            logger.debug(`Successfully wrote file: ${filePath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to write file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Create a new file with content (fails if file already exists)
     */
    async createFile(filePath: string, content: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);

            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(absolutePath));

            // Use 'wx' flag to fail if file exists
            await fs.writeFile(absolutePath, content, { flag: 'wx', encoding: 'utf-8' });

            logger.debug(`Successfully created file: ${filePath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to create file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Insert content into an existing file at a specific location
     */
    async insertIntoFile(filePath: string, options: InsertOptions): Promise<FileOperationResult> {
        const { content, marker, position = 'after', createIfNotExists = false } = options;

        try {
            const absolutePath = path.resolve(filePath);

            // Read the existing file
            const readResult = await this.readFile(absolutePath);
            if (!readResult.success) {
                return readResult;
            }

            let fileContent = readResult.data as string;
            let insertIndex = -1;

            if (marker) {
                // Find the marker in the file
                insertIndex = fileContent.indexOf(marker);

                if (insertIndex === -1) {
                    if (createIfNotExists) {
                        // Add the marker at the end of the file
                        fileContent += `\n${marker}\n`;
                        insertIndex = fileContent.length - marker.length - 1;
                    } else {
                        return {
                            success: false,
                            error: `Marker "${marker}" not found in file ${filePath}`
                        };
                    }
                }
            } else {
                // No marker specified, insert at the end
                insertIndex = fileContent.length;
            }

            let newContent: string;

            if (position === 'replace' && marker) {
                // Replace the marker
                newContent = fileContent.replace(marker, content);
            } else if (position === 'before' && marker) {
                // Insert before marker
                newContent = fileContent.slice(0, insertIndex) + content + '\n' + fileContent.slice(insertIndex);
            } else {
                // Insert after marker or at end
                const insertPos = marker ? insertIndex + marker.length : insertIndex;
                newContent = fileContent.slice(0, insertPos) + '\n' + content + fileContent.slice(insertPos);
            }

            // Write the modified content back
            const writeResult = await this.writeFile(absolutePath, newContent);
            if (writeResult.success) {
                logger.debug(`Successfully inserted content into file: ${filePath}`);
            }

            return writeResult;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to insert into file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Append content to the end of a file
     */
    async appendToFile(filePath: string, content: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);

            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(absolutePath));

            await fs.appendFile(absolutePath, content, 'utf-8');

            logger.debug(`Successfully appended to file: ${filePath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to append to file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Check if a file exists
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.access(absolutePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if a directory exists
     */
    async directoryExists(dirPath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(dirPath);
            const stat = await fs.stat(absolutePath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDirectoryExists(dirPath: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(dirPath);
            await fs.mkdir(absolutePath, { recursive: true });

            logger.debug(`Ensured directory exists: ${dirPath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to create directory ${dirPath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * List files in a directory
     */
    async listDirectory(dirPath: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(dirPath);
            const files = await fs.readdir(absolutePath);

            logger.debug(`Successfully listed directory: ${dirPath}`);
            return {
                success: true,
                data: files
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to list directory ${dirPath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Get file stats
     */
    async getFileStats(filePath: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);
            const stats = await fs.stat(absolutePath);

            logger.debug(`Successfully got stats for file: ${filePath}`);
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to get stats for file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<FileOperationResult> {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.unlink(absolutePath);

            logger.debug(`Successfully deleted file: ${filePath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to delete file ${filePath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Copy a file
     */
    async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
        try {
            const sourceAbsolute = path.resolve(sourcePath);
            const destAbsolute = path.resolve(destPath);

            // Ensure destination directory exists
            await this.ensureDirectoryExists(path.dirname(destAbsolute));

            await fs.copyFile(sourceAbsolute, destAbsolute);

            logger.debug(`Successfully copied file from ${sourcePath} to ${destPath}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to copy file from ${sourcePath} to ${destPath}:`, errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}

// Export singleton instance for easy use across the application
export const fileManager = FileManager.getInstance();

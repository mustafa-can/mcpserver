import { describe, it, expect } from 'vitest';
import { calculateHandler } from './index.js';

describe('Calculator Tool', () => {
    it('should add two numbers correctly', async () => {
        const result = await calculateHandler({ operation: 'add', a: 5, b: 3 });
        expect(result.content[0].text).toBe('8');
    });

    it('should subtract two numbers correctly', async () => {
        const result = await calculateHandler({ operation: 'subtract', a: 10, b: 4 });
        expect(result.content[0].text).toBe('6');
    });

    it('should multiply two numbers correctly', async () => {
        const result = await calculateHandler({ operation: 'multiply', a: 7, b: 6 });
        expect(result.content[0].text).toBe('42');
    });

    it('should divide two numbers correctly', async () => {
        const result = await calculateHandler({ operation: 'divide', a: 20, b: 5 });
        expect(result.content[0].text).toBe('4');
    });

    it('should handle division by zero', async () => {
        const result = await calculateHandler({ operation: 'divide', a: 10, b: 0 });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe('Error: Division by zero');
    });
});

/**
 * Batch Processor with Rate Limiting
 *
 * Processes tasks in batches with configurable concurrency limits
 * and delays to prevent API rate limiting.
 */

export interface BatchProcessorOptions {
  maxConcurrent: number;
  minDelayBetweenRequests?: number;
  onBatchComplete?: (results: any[]) => void;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Processes an array of tasks with concurrency control
 *
 * @param tasks - Array of async functions to execute
 * @param options - Batch processing options
 * @returns Promise that resolves with array of results
 */
export async function processBatch<T>(
  tasks: (() => Promise<T>)[],
  options: BatchProcessorOptions
): Promise<T[]> {
  const {
    maxConcurrent,
    minDelayBetweenRequests = 0,
    onBatchComplete,
    onProgress,
  } = options;

  const results: T[] = [];
  const errors: Error[] = [];
  let activeCount = 0;
  let completedCount = 0;
  let taskIndex = 0;

  return new Promise((resolve, reject) => {
    const startNext = async () => {
      // If all tasks are done, resolve or reject
      if (completedCount === tasks.length) {
        if (errors.length > 0) {
          console.error(`[BatchProcessor] Failed with ${errors.length} errors out of ${tasks.length} tasks`);
          // Reject with a summary error that includes all failures
          const errorMessage = `Batch processing failed: ${errors.length}/${tasks.length} tasks failed`;
          const batchError = new Error(errorMessage);
          (batchError as any).errors = errors;
          (batchError as any).results = results;
          reject(batchError);
          return;
        }
        if (onBatchComplete) {
          onBatchComplete(results);
        }
        resolve(results);
        return;
      }

      // If we've started all tasks, wait for completion
      if (taskIndex >= tasks.length) {
        return;
      }

      // If we're at max concurrency, wait
      if (activeCount >= maxConcurrent) {
        return;
      }

      // Get next task
      const currentIndex = taskIndex++;
      const task = tasks[currentIndex];

      activeCount++;

      try {
        // Add delay if specified
        if (minDelayBetweenRequests && currentIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, minDelayBetweenRequests));
        }

        // Execute task
        const result = await task();
        results[currentIndex] = result;
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, tasks.length);
        }
      } catch (error) {
        console.error(`[BatchProcessor] Task ${currentIndex} failed:`, error);
        const errorObj = error instanceof Error ? error : new Error(String(error));
        errors.push(errorObj);
        // Store undefined in results to maintain array indices
        results[currentIndex] = undefined as any;
        completedCount++;

        // Still call onProgress even for errors
        if (onProgress) {
          onProgress(completedCount, tasks.length);
        }
      } finally {
        activeCount--;

        // Start next tasks to maintain concurrency
        startNext();
        startNext(); // Call twice to potentially fill two slots
      }
    };

    // Start initial batch
    for (let i = 0; i < Math.min(maxConcurrent, tasks.length); i++) {
      startNext();
    }
  });
}

/**
 * Processes tasks in sequential batches (batch 1, then batch 2, etc.)
 *
 * @param tasks - Array of tasks to process
 * @param batchSize - Number of tasks per batch
 * @param delayBetweenBatches - Delay in ms between batches
 * @returns Promise that resolves with array of results
 */
export async function processInBatches<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number,
  delayBetweenBatches: number = 0
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`[BatchProcessor] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}`);

    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);

    // Add delay between batches if specified
    if (delayBetweenBatches > 0 && i + batchSize < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

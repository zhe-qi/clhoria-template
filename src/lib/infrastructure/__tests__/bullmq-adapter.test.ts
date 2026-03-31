import { Effect } from "effect";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { JobName, QueueName } from "@/lib/enums/bullmq";

import { queueManager } from "../bullmq-adapter";

describe("BullMQ Type Safety", () => {
  afterAll(async () => {
    await Effect.runPromise(queueManager.close());
  });

  describe("addJob - Type Safety", () => {
    describe("EMAIL queue jobs", () => {
      it("should add EMAIL_SEND_WELCOME job with all fields", async () => {
        const program = queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_WELCOME, {
          email: "user@example.com",
          username: "testuser",
          subject: "Welcome to our platform!",
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.EMAIL_SEND_WELCOME);
        expect(job.data).toMatchObject({
          email: "user@example.com",
          username: "testuser",
          subject: "Welcome to our platform!",
        });
        expect(job.id).toBeDefined();
      });

      it("should add EMAIL_SEND_WELCOME job without optional subject", async () => {
        const program = queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_WELCOME, {
          email: "user@example.com",
          username: "testuser",
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.EMAIL_SEND_WELCOME);
        expect(job.data.email).toBe("user@example.com");
        expect(job.data.username).toBe("testuser");
        expect(job.data.subject).toBeUndefined();
      });

      it("should add EMAIL_SEND_RESET_PASSWORD job", async () => {
        const expiresAt = new Date(Date.now() + 3600000).toISOString();
        const program = queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_RESET_PASSWORD, {
          email: "user@example.com",
          resetToken: "abc123xyz",
          expiresAt,
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.EMAIL_SEND_RESET_PASSWORD);
        expect(job.data).toMatchObject({
          email: "user@example.com",
          resetToken: "abc123xyz",
          expiresAt,
        });
      });

      it("should add job with BullMQ options", async () => {
        const program = queueManager.addJob(
          QueueName.EMAIL,
          JobName.EMAIL_SEND_WELCOME,
          {
            email: "user@example.com",
            username: "testuser",
          },
          {
            priority: 1,
            delay: 5000,
            attempts: 3,
          },
        );

        const job = await Effect.runPromise(program);

        expect(job.opts.priority).toBe(1);
        expect(job.opts.delay).toBe(5000);
        expect(job.opts.attempts).toBe(3);
      });
    });

    describe("CLEANUP queue jobs", () => {
      it("should add CLEANUP_DAILY job without optional targetDate", async () => {
        const program = queueManager.addJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY, {});

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.CLEANUP_DAILY);
        expect(job.data).toEqual({});
      });

      it("should add CLEANUP_DAILY job with targetDate", async () => {
        const program = queueManager.addJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY, {
          targetDate: "2024-01-01",
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.CLEANUP_DAILY);
        expect(job.data.targetDate).toBe("2024-01-01");
      });

      it("should add CLEANUP_OLD_LOGS job", async () => {
        const program = queueManager.addJob(QueueName.CLEANUP, JobName.CLEANUP_OLD_LOGS, {
          daysToKeep: 30,
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.CLEANUP_OLD_LOGS);
        expect(job.data.daysToKeep).toBe(30);
      });
    });

    describe("NOTIFICATION queue jobs", () => {
      it("should add NOTIFICATION_PUSH job without optional data", async () => {
        const program = queueManager.addJob(QueueName.NOTIFICATION, JobName.NOTIFICATION_PUSH, {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          title: "New message",
          body: "You have a new message from John",
        });

        const job = await Effect.runPromise(program);

        expect(job.name).toBe(JobName.NOTIFICATION_PUSH);
        expect(job.data).toMatchObject({
          userId: "550e8400-e29b-41d4-a716-446655440000",
          title: "New message",
          body: "You have a new message from John",
        });
      });

      it("should add NOTIFICATION_PUSH job with additional data", async () => {
        const program = queueManager.addJob(QueueName.NOTIFICATION, JobName.NOTIFICATION_PUSH, {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          title: "New message",
          body: "You have a new message",
          data: {
            messageId: "msg-123",
            sender: "john@example.com",
            priority: "high",
          },
        });

        const job = await Effect.runPromise(program);

        expect(job.data.data).toEqual({
          messageId: "msg-123",
          sender: "john@example.com",
          priority: "high",
        });
      });
    });
  });

  describe("addJob - Runtime Validation", () => {
    it("should reject job with missing required field", async () => {
      const program = queueManager.addJob(
        QueueName.EMAIL,
        JobName.EMAIL_SEND_WELCOME,
        { email: "user@example.com" } as any, // Missing 'username'
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with invalid email format", async () => {
      const program = queueManager.addJob(
        QueueName.EMAIL,
        JobName.EMAIL_SEND_WELCOME,
        {
          email: "not-an-email",
          username: "testuser",
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with invalid UUID format", async () => {
      const program = queueManager.addJob(
        QueueName.NOTIFICATION,
        JobName.NOTIFICATION_PUSH,
        {
          userId: "not-a-uuid",
          title: "Test",
          body: "Test body",
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with invalid datetime format", async () => {
      const program = queueManager.addJob(
        QueueName.EMAIL,
        JobName.EMAIL_SEND_RESET_PASSWORD,
        {
          email: "user@example.com",
          resetToken: "abc123",
          expiresAt: "invalid-datetime",
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with invalid date format", async () => {
      const program = queueManager.addJob(
        QueueName.CLEANUP,
        JobName.CLEANUP_DAILY,
        {
          targetDate: "2024-13-45", // Invalid date
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with negative daysToKeep", async () => {
      const program = queueManager.addJob(
        QueueName.CLEANUP,
        JobName.CLEANUP_OLD_LOGS,
        {
          daysToKeep: -5,
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject job with non-integer daysToKeep", async () => {
      const program = queueManager.addJob(
        QueueName.CLEANUP,
        JobName.CLEANUP_OLD_LOGS,
        {
          daysToKeep: 7.5,
        } as any,
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });

  describe("registerWorker - Type Safety", () => {
    it("should register worker for EMAIL queue", () => {
      const mockProcessor = vi.fn(async () => ({ success: true }));

      const program = queueManager.registerWorker(QueueName.EMAIL, mockProcessor);

      const worker = Effect.runSync(program);

      expect(worker).toBeDefined();
      expect(queueManager.getWorkerNames()).toContain(QueueName.EMAIL);
    });

    it("should not register duplicate worker", () => {
      // Worker already registered in previous test
      const mockProcessor = vi.fn(async () => ({ success: true }));

      const program = queueManager.registerWorker(QueueName.EMAIL, mockProcessor);

      const worker = Effect.runSync(program);

      expect(worker).toBeDefined();
      // Should still only have one EMAIL worker
      expect(queueManager.getWorkerNames().filter(name => name === QueueName.EMAIL)).toHaveLength(1);
    });

    it("should register worker for CLEANUP queue", () => {
      const mockProcessor = vi.fn(async () => ({ success: true }));

      const program = queueManager.registerWorker(QueueName.CLEANUP, mockProcessor);

      const worker = Effect.runSync(program);

      expect(worker).toBeDefined();
      expect(queueManager.getWorkerNames()).toContain(QueueName.CLEANUP);
    });

    it("should register worker for NOTIFICATION queue", () => {
      const mockProcessor = vi.fn(async () => ({ success: true }));

      const program = queueManager.registerWorker(QueueName.NOTIFICATION, mockProcessor);

      const worker = Effect.runSync(program);

      expect(worker).toBeDefined();
      expect(queueManager.getWorkerNames()).toContain(QueueName.NOTIFICATION);
    });

    it("should register worker with options", () => {
      const mockProcessor = vi.fn(async () => ({ success: true }));

      const program = queueManager.registerWorker(QueueName.CLEANUP, mockProcessor, {
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      });

      const worker = Effect.runSync(program);

      expect(worker).toBeDefined();
    });
  });

  describe("registerWorker - Job Processing", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should process EMAIL_SEND_WELCOME job with correct data type", async () => {
      const mockProcessor = vi.fn(async (job) => {
        // TypeScript should infer job.data type
        expect(job.data.email).toBeDefined();
        expect(job.data.username).toBeDefined();

        return { success: true };
      });

      // Add job
      const addProgram = queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_WELCOME, {
        email: "test@example.com",
        username: "testuser",
      });

      const job = await Effect.runPromise(addProgram);

      // Process job manually (simulating worker processing)
      await mockProcessor(job);

      expect(mockProcessor).toHaveBeenCalledTimes(1);
      expect(mockProcessor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: JobName.EMAIL_SEND_WELCOME,
          data: expect.objectContaining({
            email: "test@example.com",
            username: "testuser",
          }),
        }),
      );
    });

    it("should handle different job types in same queue", async () => {
      const processedJobs: string[] = [];

      const mockProcessor = vi.fn(async (job) => {
        processedJobs.push(job.name);

        if (job.name === JobName.EMAIL_SEND_WELCOME) {
          expect(job.data.username).toBeDefined();
        }
        else if (job.name === JobName.EMAIL_SEND_RESET_PASSWORD) {
          expect(job.data.resetToken).toBeDefined();
        }

        return { success: true };
      });

      // Add different job types
      const job1 = await Effect.runPromise(
        queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_WELCOME, {
          email: "user1@example.com",
          username: "user1",
        }),
      );

      const job2 = await Effect.runPromise(
        queueManager.addJob(QueueName.EMAIL, JobName.EMAIL_SEND_RESET_PASSWORD, {
          email: "user2@example.com",
          resetToken: "token123",
          expiresAt: new Date().toISOString(),
        }),
      );

      // Process jobs
      await mockProcessor(job1);
      await mockProcessor(job2);

      expect(mockProcessor).toHaveBeenCalledTimes(2);
      expect(processedJobs).toEqual([JobName.EMAIL_SEND_WELCOME, JobName.EMAIL_SEND_RESET_PASSWORD]);
    });
  });

  describe("scheduleJob - Type Safety", () => {
    it("should schedule repeatable job with cron pattern", async () => {
      const program = queueManager.scheduleJob(
        QueueName.CLEANUP,
        JobName.CLEANUP_DAILY,
        {},
        {
          pattern: "0 0 * * *", // Daily at midnight
        },
      );

      await Effect.runPromise(program);

      // Verify scheduled jobs (使用新的 Job Schedulers API)
      const scheduledJobsProgram = queueManager.getScheduledJobs(QueueName.CLEANUP);
      const scheduledJobs = await Effect.runPromise(scheduledJobsProgram);

      const schedulerId = `${QueueName.CLEANUP}:${JobName.CLEANUP_DAILY}`;

      expect(scheduledJobs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: schedulerId,
          }),
        ]),
      );
    });

    it("should schedule job with every interval", async () => {
      const program = queueManager.scheduleJob(
        QueueName.CLEANUP,
        JobName.CLEANUP_OLD_LOGS,
        {
          daysToKeep: 7,
        },
        {
          every: 3600000, // Every hour
        },
      );

      await Effect.runPromise(program);

      const scheduledJobsProgram = queueManager.getScheduledJobs(QueueName.CLEANUP);
      const scheduledJobs = await Effect.runPromise(scheduledJobsProgram);

      expect(scheduledJobs.length).toBeGreaterThan(0);
    });

    it("should validate scheduled job data with Zod", async () => {
      const program = queueManager.scheduleJob(
        QueueName.EMAIL,
        JobName.EMAIL_SEND_WELCOME,
        {
          email: "invalid-email", // Invalid email
          username: "testuser",
        } as any,
        {
          pattern: "0 0 * * *",
        },
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });

  describe("unscheduleJob", () => {
    it("should remove scheduled job", async () => {
      // Use unique pattern to avoid conflicts with other tests
      const repeatOptions = {
        pattern: "0 23 * * *", // Daily at 11pm (unique pattern)
      };

      await Effect.runPromise(
        queueManager.scheduleJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY, {}, repeatOptions),
      );

      // Verify it exists
      let scheduledJobs = await Effect.runPromise(queueManager.getScheduledJobs(QueueName.CLEANUP));
      const schedulerId = `${QueueName.CLEANUP}:${JobName.CLEANUP_DAILY}`;
      const jobExists = scheduledJobs.some(job => job.key === schedulerId);

      expect(jobExists).toBe(true);

      // Remove it (新 API 不需要 repeatOptions)
      await Effect.runPromise(queueManager.unscheduleJob(QueueName.CLEANUP, JobName.CLEANUP_DAILY));

      // Verify it's removed
      scheduledJobs = await Effect.runPromise(queueManager.getScheduledJobs(QueueName.CLEANUP));
      const jobStillExists = scheduledJobs.some(job => job.key === schedulerId);

      expect(jobStillExists).toBe(false);
    });
  });

  describe("Queue Management", () => {
    it("should return all queue names", () => {
      const queueNames = queueManager.getQueueNames();

      expect(queueNames).toEqual(expect.arrayContaining([QueueName.EMAIL, QueueName.CLEANUP, QueueName.NOTIFICATION]));
    });

    it("should return all worker names", () => {
      const workerNames = queueManager.getWorkerNames();

      expect(workerNames).toEqual(expect.arrayContaining([QueueName.EMAIL, QueueName.CLEANUP, QueueName.NOTIFICATION]));
    });

    it("should get queue by name", () => {
      const queue = queueManager.getQueue(QueueName.EMAIL);

      expect(queue).toBeDefined();
      expect(queue.name).toBe(QueueName.EMAIL);
    });
  });

  describe("Error Handling", () => {
    it("should handle scheduleJob errors gracefully", async () => {
      // Use invalid repeat options to trigger error
      const program = queueManager.scheduleJob(
        QueueName.EMAIL,
        JobName.EMAIL_SEND_WELCOME,
        {
          email: "test@example.com",
          username: "testuser",
        },
        {} as any, // Invalid repeat options
      );

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should handle unscheduleJob with non-existent job", async () => {
      // Try to remove a non-existent scheduled job (新 API 只需要 queueName 和 jobName)
      const program = queueManager.unscheduleJob(QueueName.EMAIL, "non-existent-job");

      // Should return false if scheduler doesn't exist
      const result = await Effect.runPromise(program);

      expect(typeof result).toBe("boolean");
    });

    it("should handle getScheduledJobs errors gracefully", async () => {
      // Get scheduled jobs from valid queue
      const program = queueManager.getScheduledJobs(QueueName.EMAIL);

      const jobs = await Effect.runPromise(program);

      // Should return array (even if empty)
      expect(Array.isArray(jobs)).toBe(true);
    });
  });
});

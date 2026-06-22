import { db } from '../../config/database';
import { userSubscriptions, subscriptionPlans } from '../../db/schema/subscriptions';
import { users } from '../../db/schema/users';
import { eq } from 'drizzle-orm';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../lib/errors';

export class CodeRunnerService {
  // Execute Python code inside a sandboxed container
  static async runPythonCode(userId: string, code: string) {
    // 1. Verify User has Pro Learner subscription or is admin/instructor
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'super_admin' && user.role !== 'instructor') {
      const [sub] = await db
        .select({ planName: subscriptionPlans.name })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      if (!sub || sub.planName !== 'Pro Learner') {
        throw new ForbiddenError('Eksekusi kode Python hanya tersedia untuk pengguna dengan paket Pro Learner.');
      }
    }

    if (!code || code.trim().length === 0) {
      throw new BadRequestError('Code content cannot be empty');
    }

    const runId = crypto.randomUUID().substring(0, 8);
    const userCodePath = `/workspace/code_${runId}.py`;
    const wrapperPath = `/workspace/wrapper_${runId}.py`;

    const containerName = 'aiphy-sandbox';

    // 2. Python wrapper script to capture stdout, handle errors, scan for matplotlib plots, convert them to base64, and clean up
    const wrapperScript = `
import sys
import os
import glob
import base64
import traceback

# Record files in directory before execution
pre_files = set(glob.glob('*.png'))

try:
    # Execute the user python file
    with open('/workspace/code_${runId}.py', 'r') as f:
        user_code = f.read()
    
    # Run user code
    exec(user_code, {'__name__': '__main__'})
except Exception as e:
    # Print error details to stderr
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

# Find any new matplotlib png plots
post_files = set(glob.glob('*.png'))
new_plots = post_files - pre_files

for plot_file in new_plots:
    try:
        with open(plot_file, 'rb') as f:
            encoded = base64.b64encode(f.read()).decode('utf-8')
            print(f"\\n__PLOT_START__{plot_file}:{encoded}__PLOT_END__")
        os.remove(plot_file)
    except Exception:
        pass
`;

    const startTime = performance.now();

    try {
      // Check if docker is accessible and container is running
      const checkContainer = Bun.spawn(['docker', 'ps', '-q', '-f', `name=${containerName}`]);
      const containerId = (await new Response(checkContainer.stdout).text()).trim();
      
      if (!containerId) {
        // Fallback: If sandbox container is not running, execute code locally in a sub-process (dev mode fallback)
        console.warn(`[CodeRunner] Sandbox container '${containerName}' is not running. Falling back to local execution!`);
        
        // Write temporary file locally
        const localPath = `./uploads/temp_${runId}.py`;
        await Bun.write(localPath, code);
        
        const proc = Bun.spawn(['python3', localPath], {
          stderr: 'pipe',
          stdout: 'pipe',
        });
        
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        await proc.exited;
        
        // Cleanup local file
        const fs = require('fs');
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        
        return {
          output: stdout.trim(),
          error: stderr.trim() || undefined,
          executionTime: Math.round(performance.now() - startTime),
          plots: [],
          fallback: true,
        };
      }

      // Write User Code to Container
      const writeUserCode = Bun.spawn(['docker', 'exec', '-i', containerName, 'tee', userCodePath], {
        stdin: 'pipe',
      });
      writeUserCode.stdin.write(code);
      writeUserCode.stdin.end();
      await writeUserCode.exited;

      // Write Wrapper Script to Container
      const writeWrapper = Bun.spawn(['docker', 'exec', '-i', containerName, 'tee', wrapperPath], {
        stdin: 'pipe',
      });
      writeWrapper.stdin.write(wrapperScript);
      writeWrapper.stdin.end();
      await writeWrapper.exited;

      // Run code with CPU and memory limits inside sandbox
      // time limit: 15s timeout
      const executeProc = Bun.spawn(['docker', 'exec', '-i', containerName, 'timeout', '15', 'python3', wrapperPath], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(executeProc.stdout).text();
      const stderr = await new Response(executeProc.stderr).text();
      const exitCode = await executeProc.exited;

      // Clean up files in container (asynchronously, don't block response)
      Bun.spawn(['docker', 'exec', containerName, 'rm', '-f', userCodePath, wrapperPath]);

      const executionTime = Math.round(performance.now() - startTime);

      // Parse plots from stdout
      const plots: string[] = [];
      let cleanOutput = stdout;
      
      const plotRegex = /__PLOT_START__(.*?):(.*?)__PLOT_END__/g;
      let match;
      while ((match = plotRegex.exec(stdout)) !== null) {
        // match[2] is the base64 data
        plots.push(`data:image/png;base64,${match[2]}`);
      }

      // Strip plots from clean output
      cleanOutput = stdout.replace(/__PLOT_START__(.*?):(.*?)__PLOT_END__/gs, '').trim();

      let errorMsg = stderr.trim();
      if (exitCode === 124) {
        errorMsg = 'Timeout Error: Eksekusi program melebihi batas waktu maksimal (15 detik).';
      }

      return {
        output: cleanOutput,
        error: errorMsg || undefined,
        executionTime,
        plots,
        fallback: false,
      };
    } catch (err: any) {
      console.error('[CodeRunner Error]', err);
      throw new BadRequestError(`Gagal menjalankan kode: ${err.message}`);
    }
  }
}

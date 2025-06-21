import { WebContainer } from '@webcontainer/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const TIMEOUT_DURATION = 60000; // 1 minute

export const startDevServer = async (webcontainerInstance: WebContainer, terminal: any): Promise<string> => {
  if (!webcontainerInstance) {
    throw new Error('WebContainer not initialized');
  }

  let retryCount = 0;

  const attemptStart = async (): Promise<string> => {
    try {
      if (terminal?.element) {
        terminal.write('\r\nStarting development server...\r\n');
      }

      const serverProcess = await webcontainerInstance.spawn('npm', ['run', 'dev', '--', '--host']);
      const [terminalStream, urlStream] = serverProcess.output.tee();
      
      if (terminal?.element) {
        terminalStream.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            }
          })
        ).catch(error => {
          console.error('Terminal stream failed:', error);
        });
      }

      return new Promise<string>((resolve, reject) => {
        let buffer = '';
        const timeout = setTimeout(() => {
          console.error('Server output before timeout:', buffer);
          reject(new Error('Timeout waiting for server URL'));
        }, TIMEOUT_DURATION);

        urlStream.pipeTo(
          new WritableStream({
            write(data) {
              buffer += data;
              
              // Look for Vite's network URL pattern
              const match = buffer.match(/Network:\s+(http:\/\/[\d.:]+)/);
              if (match) {
                const networkUrl = match[1];
                const port = new URL(networkUrl).port;
                // Get the WebContainer-accessible URL
                const url = webcontainerInstance.getUrl(parseInt(port, 10));
                console.log('WebContainer Preview URL:', url);
                
                if (terminal?.element) {
                  terminal.write(`\r\n🔗 Preview URL: ${url}\r\n`);
                }
                
                clearTimeout(timeout);
                resolve(url);
              }
            }
          })
        ).catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Server start attempt failed:', error);
      
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        if (terminal?.element) {
          terminal.write(`\r\nRetrying server start (attempt ${retryCount}/${MAX_RETRIES})...\r\n`);
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return attemptStart();
      }
      
      throw error;
    }
  };

  return attemptStart();
};
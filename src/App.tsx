import { useState } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { type Parser } from '@intervene/parser';
import CodeEditor from '@uiw/react-codemirror';
import { Loader2Icon, StopCircleIcon } from 'lucide-react';
import { AsyncReturnType } from 'type-fest';

import ConfigForm from '@/components/ConfigForm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  ConfigSchemaZ,
  defaultConfig,
  getConfig,
  setConfig,
} from '@/lib/config';
import githubOpenapi from '@/lib/github.openapi.json';
import twitterOpenapi from '@/lib/twitter.openapi.json';
import { cn } from '@/lib/utils';
import AgentWorker from '@/sw/worker?worker';
import { OpenApi } from '@/types/openapi';

const twitterConfig: Partial<ConfigSchemaZ> = {
  objective: 'list recent tweets of the user',
  openapis: [twitterOpenapi as unknown as OpenApi],
  context: ['{', '  "username": { "type": "string" }', '}'].join('\n'),
};

const githubConfig: Partial<ConfigSchemaZ> = {
  objective: 'list repositories of the user',
  openapis: [githubOpenapi as unknown as OpenApi],
  context: ['{', '  "username": { "type": "string" }', '}'].join('\n'),
};

type ParserResult = AsyncReturnType<Parser['parse']>;

export default function App() {
  const [appState, setAppState] = useState<'form' | 'parsing' | 'parsed'>(
    'form',
  );
  const [logs, setLogs] = useState<
    { type: 'log' | 'error' | 'warn' | 'info'; message: any[] }[]
  >([]);
  const [output, setOutput] = useState<ParserResult>();
  const [worker, setWorker] = useState<Worker>();
  const [configFormKey, setConfigFormKey] = useState(0);

  const onSubmit = async () => {
    setAppState('parsing');
    setLogs([]);

    worker?.terminate();
    const newWorker = new AgentWorker();
    setWorker(newWorker);

    await new Promise<void>((resolve) => {
      newWorker.addEventListener('message', (e) => {
        if (e.data.type === 'done') {
          resolve();
          if (e.data.error) {
            setLogs((prev) => [
              ...prev,
              { type: 'error', message: [e.data.error.message] },
            ]);
          } else {
            setOutput(e.data.data);
          }
        } else if (e.data.type && e.data.message) {
          setLogs((prev) => [
            ...prev,
            { type: e.data.type, message: e.data.message },
          ]);
        }
      });

      newWorker.addEventListener('error', (e) => {
        console.error(e);
      });

      newWorker.addEventListener('messageerror', (e) => {
        console.error(e);
      });

      newWorker.postMessage('run');
    });

    setAppState('parsed');
  };

  return (
    <div className={'container py-8'}>
      <div className="flex flex-col sm:flex-row justify-between">
        <div>
          <a
            className={cn(
              'mb-8 flex gap-3 items-center shadow border rounded-lg p-1.5 pr-3 h-fit',
              'w-fit hover:shadow-md hover:underline bg-background',
            )}
            href="https://github.com/tryintervene/parser"
            target="_blank"
          >
            <img
              src="/parser-demo/logo.svg"
              alt="logo"
              className="w-8 rounded-lg"
            />
            <h1 className="text-lg">@intervene/parser</h1>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-left text-primary/50 text-xs font-normal h-fit py-1"
              >
                Overwhelmed? <br />
                Click here to auto fill the form
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={async () => {
                  const config = await getConfig();
                  await setConfig({
                    ...defaultConfig,
                    ...config,
                    ...twitterConfig,
                  });
                  setConfigFormKey(configFormKey + 1);
                }}
              >
                Twitter Demo
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  const config = await getConfig();
                  await setConfig({
                    ...defaultConfig,
                    ...config,
                    ...githubConfig,
                  });
                  setConfigFormKey(configFormKey + 1);
                }}
              >
                Github Demo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="sm:text-right">
          <p>
            Open source NLA. <br />
            Parse natural language into API calls
          </p>
          <p className="max-w-md text-xs text-primary/50 mt-3">
            Don't worry, everything is stored locally inside your browser
            <br />
            The only data that leaves your system is to the APIs you use
          </p>
        </div>
      </div>

      <Separator className="my-8" />

      {appState === 'form' && (
        <ConfigForm key={configFormKey} onSubmit={onSubmit} />
      )}

      {appState === 'parsing' && (
        <div className="flex justify-between items-center mb-10">
          <Loader2Icon className="animate-spin" />
          <Button
            variant="outline"
            size={'sm'}
            onClick={() => {
              worker?.terminate();
              setAppState('parsed');
              setLogs((prev) => [
                ...prev,
                { type: 'error', message: ['Terminated by the user'] },
              ]);
            }}
          >
            <StopCircleIcon className="w-4 mr-2" />
            Stop
          </Button>
        </div>
      )}

      {appState === 'parsed' && (
        <Button className="mb-10" onClick={() => setAppState('form')}>
          Go back
        </Button>
      )}

      {output && (
        <div className="space-y-2 mb-10">
          <p>
            JS code to call the{' '}
            <pre className="inline text-sm bg-gray-200 p-1 rounded">
              {output.path}
            </pre>{' '}
            API:
          </p>
          <CodeEditor
            readOnly
            value={`
${output.pathParams}
${output.queryParams}
${output.bodyParams}

let apiUrl = 'http://server.com/api' + '${output.path}';

const bodyParams = get_body_params(); 
const queryParams = get_query_params(); 
const pathParams = get_path_params(); 

// Replace path parameters
for (const [key, value] of Object.entries(pathParams)) {
  apiUrl = apiUrl.replace('{' + key + '}', value);
}

const queryString = new URLSearchParams(queryParams).toString();

const result = await fetch(apiUrl + '?' + queryString, {
  method: '${output.method.toUpperCase()}',
  headers: {
    'Content-Type': '${output.responseContentType}'
  },
  body: JSON.stringify(bodyParams)
})
`}
            theme="dark"
            maxHeight="300px"
            extensions={[javascript()]}
          />
          <Accordion type="single" collapsible>
            <AccordionItem value="code-snippet" className="border-b-0">
              <AccordionTrigger className="text-sm">
                Click here to reveal the full output from the parser
              </AccordionTrigger>
              <AccordionContent>
                <CodeEditor
                  readOnly
                  value={JSON.stringify(output, null, 2)}
                  theme="dark"
                  maxHeight="300px"
                  extensions={[json()]}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />
        </div>
      )}

      {appState !== 'form' &&
        logs
          .slice()
          .reverse()
          .map((log, i) => (
            <div
              key={`log-${i}`}
              className={cn(
                {
                  'bg-green-50': log.type === 'info',
                  'bg-red-50': log.type === 'error',
                  'bg-yellow-50': log.type === 'warn',
                  'bg-blue-50': log.type === 'log',
                },
                'border-b gap-2 p-2 flex flex-wrap',
              )}
            >
              {log.message.map((m, j) => {
                if (typeof m === 'object') {
                  return (
                    <div
                      key={`log-${i}-${j}`}
                      className="max-h-72 w-full overflow-auto rounded"
                    >
                      <CodeEditor
                        value={JSON.stringify(m, null, 2)}
                        extensions={[json()]}
                        theme="dark"
                        maxHeight="300px"
                        readOnly
                      />
                    </div>
                  );
                }

                return <span key={`log-${i}-${j}`}>{m}</span>;
              })}
            </div>
          ))}
    </div>
  );
}

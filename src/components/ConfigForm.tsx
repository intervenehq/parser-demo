import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import SwaggerParser from '@apidevtools/swagger-parser';
import { json } from '@codemirror/lang-json';
import { zodResolver } from '@hookform/resolvers/zod';
import { CodeGenLanguage } from '@intervene/parser';
import CodeEditor from '@uiw/react-codemirror';
import { memoize } from 'lodash';
import { RotateCcwIcon, UploadIcon, XIcon } from 'lucide-react';
import objectSizeOf from 'object-sizeof';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  configSchema,
  ConfigSchemaZ,
  getConfig,
  setConfig,
  VectorStore,
} from '@/lib/config';
import { OpenApi } from '@/types/openapi';

const formDefaultValue: ConfigSchemaZ = {
  objective: '',
  openaiApiKey: '',
  openapis: [],
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-ada-002',
  llmProvider: 'openai',
  llmModel: 'gpt-4',
  context: ['{', '  ', '}'].join('\n'),
  vectorStore: VectorStore.Voya,
  chromaHost: 'http://0.0.0.0:8000',
  chromaCollection: 'intervene-parser',
  codeGenLanguage: CodeGenLanguage.javascript,
};

const cachedSizeof = memoize((file) => Math.round(objectSizeOf(file) / 1024));

const ConfigForm = (props: { onSubmit: () => void }) => {
  const form = useForm<ConfigSchemaZ>({
    resolver: zodResolver(configSchema),
    defaultValues: async () => {
      const val = await getConfig();

      return val ?? formDefaultValue;
    },
  });

  const watchForm = form.watch();

  useEffect(() => {
    setConfig(watchForm);
  }, [watchForm]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const data = await file?.text();
    if (!data) return;

    try {
      const openapi = await SwaggerParser.parse(JSON.parse(data));

      form.setValue('openapis', [openapi as OpenApi]);
    } catch (e) {
      alert('Invalid OpenAPI spec');
    }

    event.target.value = '';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objective</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Call xyz api to do blah blah blah"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Keep it clear and concise. It should match to exactly one atomic
                operation.
                <br />
                <br />
                <b>Bad:</b> Find subscription of john@doe.com.
                <br /> <b>Good:</b> (break it down in two atomic operations)
                <br />
                1. Given the email, find customer details.
                <br /> 2. Given the customer details, find the subscriptions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-2">
          <FormLabel>Open API specs</FormLabel>
          <div className="flex flex-wrap gap-2">
            {watchForm.openapis?.map((file, i) => {
              return (
                <div
                  className="border rounded p-2 text-sm flex gap-2 items-center"
                  key={`openapi-${i}`}
                >
                  {file.info?.title} ({cachedSizeof(file)} KB)
                  <Button
                    variant="ghost"
                    className="p-0 h-4"
                    onClick={() =>
                      form.setValue(
                        'openapis',
                        form
                          .getValues('openapis')
                          ?.filter((_, index) => index !== i),
                      )
                    }
                  >
                    <XIcon className="w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            type="button"
            variant={!watchForm.openapis?.length ? 'default' : 'outline'}
            asChild
            className="cursor-pointer"
          >
            <Label htmlFor="openapi-uploader">
              <UploadIcon className="w-4 mr-3" />
              Upload Open API spec
            </Label>
          </Button>
          <input
            className="w-0 h-0 overflow-hidden opacity-0"
            type="file"
            accept=".json, .yaml"
            id="openapi-uploader"
            onChange={onFileChange}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="embeddingProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Embedding provider</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select embedding provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {configSchema.shape.embeddingProvider.options.map(
                        (option) => (
                          <SelectItem value={option} key={option}>
                            {option}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="embeddingModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Embedding Model</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select embedding model" />
                    </SelectTrigger>
                    <SelectContent>
                      {configSchema.shape.embeddingModel.options.map(
                        (option) => (
                          <SelectItem value={option} key={option}>
                            {option}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="llmProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM provider</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LLM provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {configSchema.shape.llmProvider.options.map((option) => (
                        <SelectItem value={option} key={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="llmModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM model</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LLM model" />
                    </SelectTrigger>
                    <SelectContent>
                      {configSchema.shape.llmModel.options.map((option) => (
                        <SelectItem value={option} key={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  Works best with GPT 4. GPT 3.5 is hit or miss.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="openaiApiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OpenAI API Key</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={form.control}
          name="vectorStore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vector Store</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vector store" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(configSchema.shape.vectorStore.enum).map(
                      ([key, value]) => (
                        <SelectItem value={value} key={key}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Chroma results in the best results.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchForm.vectorStore === VectorStore.Chroma && (
          <>
            <FormField
              control={form.control}
              name="chromaHost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chroma host</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chromaCollection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chroma collection</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {watchForm.vectorStore === VectorStore.Pinecone && (
          <>
            <FormField
              control={form.control}
              name="pineconeIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pinecone index</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pineconeApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pinecone API key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pineconeEnvironment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pinecone environment</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>eg. gcp-starter</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Separator />

        <FormField
          control={form.control}
          name="context"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Context</FormLabel>
                <FormControl>
                  <CodeEditor
                    {...field}
                    extensions={[json()]}
                    theme="dark"
                    maxHeight="300px"
                  />
                </FormControl>
                <FormMessage />
                <FormDescription className="flex flex-col">
                  <span>
                    A JSON object representing the context for this task. Think
                    of this as a collection of variables when writing a program.
                  </span>
                  <span className="mt-1">
                    This is a key value pair, key being the name of this
                    contextual datum and the value being the respective JSON
                    schema.
                  </span>
                </FormDescription>
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="codeGenLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code-Gen langauge</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a programming language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(
                      configSchema.shape.codeGenLanguage.enum,
                    ).map(([key, value]) => (
                      <SelectItem value={value} key={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button type="submit">Submit</Button>
          <Button
            variant="ghost"
            className="text-red-700"
            onClick={() => form.reset(formDefaultValue)}
            type="button"
          >
            <RotateCcwIcon className="w-4 mr-2" />
            reset form
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ConfigForm;

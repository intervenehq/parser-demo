export interface OpenApi {
  openapi?: string;
  info: Info;
  servers?: Server[];
  paths: Paths;
  components?: Components;
  tags?: Tag[];
}

interface Info {
  title: string;
  description?: string;
  version: string;
}

interface Server {
  url: string;
  description?: string;
  variables?: { [key: string]: ServerVariable };
}

interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

interface Paths {
  [path: string]: PathItem;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
}

interface Operation {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  responses: Responses;
}

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Schema;
}

interface Responses {
  [statusCode: string]: Response;
}

interface Response {
  description: string;
  content?: { [mediaType: string]: MediaType };
}

interface MediaType {
  schema?: Schema;
}

interface Schema {
  type: string;
  items?: Schema;
}

interface Components {
  schemas?: { [key: string]: Schema };
}

interface Tag {
  name: string;
  description?: string;
}

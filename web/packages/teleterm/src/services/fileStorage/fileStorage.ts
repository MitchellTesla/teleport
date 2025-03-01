/**
 * Copyright 2023 Gravitational, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs, { existsSync, readFileSync, writeFileSync } from 'fs';

import { debounce } from 'lodash';

import Logger from 'teleterm/logger';

const logger = new Logger('FileStorage');

export interface FileStorage {
  put(path: string, json: any): void;

  putAllSync(): void;

  get<T>(path?: string): T;
}

export function createFileStorage(opts: {
  filePath: string;
  debounceWrites: boolean;
}): FileStorage {
  if (!opts || !opts.filePath) {
    throw Error('missing filePath');
  }

  const { filePath } = opts;
  const state = loadState(opts.filePath);

  function put(key: string, json: any) {
    state[key] = json;
    const text = stringify(state);

    opts.debounceWrites
      ? writeFileDebounced(filePath, text)
      : writeFile(filePath, text);
  }

  function putAllSync() {
    const text = stringify(state);
    try {
      fs.writeFileSync(filePath, text);
    } catch (error) {
      logger.error(`Cannot update ${filePath} file`, error);
    }
  }

  function get<T>(key?: string): T {
    return key ? state[key] : (state as T);
  }

  return {
    put,
    putAllSync,
    get,
  };
}

function loadState(filePath: string) {
  try {
    if (!existsSync(filePath)) {
      writeFileSync(filePath, '{}');
    }

    return JSON.parse(readFileSync(filePath, { encoding: 'utf-8' }));
  } catch (error) {
    logger.error(`Cannot read ${filePath} file`, error);
    return {};
  }
}

function stringify(state: any) {
  return JSON.stringify(state, null, 2);
}

const writeFileDebounced = debounce(
  (filePath: string, text: string) => writeFile(filePath, text),
  2000
);

const writeFile = (filePath: string, text: string) =>
  fs.promises.writeFile(filePath, text).catch(error => {
    logger.error(`Cannot update ${filePath} file`, error);
  });

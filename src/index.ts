/*
 * Copyright (c) 2020 genshin.dev
 * Licensed under the Open Software License version 3.0
 * Modificado para el Taller DevOps (ver README.md).
 */
import { createApp } from './app';

const port = Number(process.env.PORT) || 5000;

createApp().listen(port, () => {
  console.log(`[API] Running on 0.0.0.0:${port}`);
});

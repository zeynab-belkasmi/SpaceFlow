import { createContainer } from './container';
import { createApp } from './presentation/app';

// Entry point: the only file with side effects (reads the environment, opens a port).
const port = Number(process.env.PORT ?? 3000);

createApp(createContainer()).listen(port, () => {
  console.log(`SpaceFlow API listening on http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api-docs`);
});

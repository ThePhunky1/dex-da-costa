import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',workers:1,timeout:60000,use:{baseURL:'http://127.0.0.1:3100',headless:true},webServer:{command:'npm run build && npm run start --workspace web -- --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:120000,stdout:'ignore',stderr:'pipe'}});

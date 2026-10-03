import process from 'node:process';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:30000,workers:1,use:{baseURL:process.env.TEST_URL||'http://127.0.0.1:4321',launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},reporter:[['list'],['json',{outputFile:'test-results/results.json'}]]});

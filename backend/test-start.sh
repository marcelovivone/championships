#!/bin/bash
set -x
cd /c/Users/milen/Documents/Personal/Championships/backend
npm run start:dev 2>&1 | head -200

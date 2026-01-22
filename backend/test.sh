#!/bin/bash

echo "í·ª Testing Championships Backend API"
echo "=================================="
echo ""

# Start the server
echo "Starting server..."
npm run start:dev &
SERVER_PID=$!
sleep 8

BASE_URL="http://localhost:3000"

echo "Testing endpoints..."
echo ""

# Test 1: Get all matches
echo "âœ“ Testing GET /matches"
curl -s $BASE_URL/matches | jq '.' | head -20
echo ""

# Test 2: Get all leagues
echo "âœ“ Testing GET /leagues"
curl -s $BASE_URL/leagues | jq '.' | head -20
echo ""

# Test 3: Get all phases
echo "âœ“ Testing GET /phases"
curl -s $BASE_URL/phases | jq '.' | head -20
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null

echo ""
echo "âœ“ Tests complete!"

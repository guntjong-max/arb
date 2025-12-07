#!/usr/bin/env python3
"""
Test script for worker login functionality
Tests login job handling with mock credentials
"""

import json
import redis
import time
import sys

# Test job data
test_jobs = [
    {
        "job_id": "test_login_1",
        "type": "login",
        "payload": {
            "bookmaker": "bet365",
            "username": "test_user",
            "password": "test_password"
        }
    },
    {
        "job_id": "test_login_2",
        "type": "login",
        "payload": {
            "bookmaker": "pinnacle",
            "username": "test_user@example.com",
            "password": "test_password"
        }
    },
    {
        "job_id": "test_login_3",
        "type": "login",
        "payload": {
            "bookmaker": "betfair",
            "username": "test_user",
            "password": "test_password"
        }
    }
]

def push_test_job(redis_client, job):
    """Push a test job to Redis queue"""
    job_json = json.dumps(job)
    redis_client.rpush('jobs:queue', job_json)
    print(f"✓ Pushed job: {job['job_id']} - {job['payload']['bookmaker']}")

def main():
    print("=" * 60)
    print("Worker Login Test - Job Pusher")
    print("=" * 60)
    print()
    
    try:
        # Connect to Redis
        redis_url = 'redis://localhost:6379'
        redis_client = redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        print(f"✓ Connected to Redis: {redis_url}")
        print()
        
        # Ask user which job to push
        print("Select test job to push:")
        print("1. Bet365 login")
        print("2. Pinnacle login")
        print("3. Betfair login")
        print("4. All bookmakers")
        print("0. Exit")
        print()
        
        choice = input("Enter choice (0-4): ").strip()
        
        if choice == '0':
            print("Exiting...")
            return
        elif choice == '1':
            push_test_job(redis_client, test_jobs[0])
        elif choice == '2':
            push_test_job(redis_client, test_jobs[1])
        elif choice == '3':
            push_test_job(redis_client, test_jobs[2])
        elif choice == '4':
            for job in test_jobs:
                push_test_job(redis_client, job)
                time.sleep(1)
        else:
            print("Invalid choice!")
            return
        
        print()
        print("=" * 60)
        print("Jobs pushed successfully!")
        print("Worker should process these jobs now.")
        print("Check worker logs for results.")
        print("=" * 60)
        
    except redis.ConnectionError as e:
        print(f"✗ Redis connection failed: {e}")
        print("Make sure Redis is running on localhost:6379")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

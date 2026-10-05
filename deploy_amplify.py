import boto3
import urllib.request
import time
from package_deploy import package

def deploy():
    package()
    session = boto3.Session(profile_name='antigravity')
    amp = session.client('amplify', region_name='us-east-1')
    app_id = 'd14utztk41y058'
    branch_name = 'main'

    print("Creating deployment job for Loafed-AI (app: d14utztk41y058, branch: main)...")
    dep = amp.create_deployment(appId=app_id, branchName=branch_name)
    job_id = dep['jobId']
    upload_url = dep['zipUploadUrl']
    print(f"Created deployment job: {job_id}")

    with open('deploy.zip', 'rb') as f:
        data = f.read()

    print(f"Uploading deploy.zip ({len(data):,} bytes) to Amplify S3...")
    req = urllib.request.Request(
        upload_url,
        data=data,
        method='PUT',
        headers={'Content-Type': 'application/zip'}
    )
    with urllib.request.urlopen(req) as resp:
        print(f"Upload completed with status code: {resp.status}")

    print("Triggering Amplify deployment...")
    res = amp.start_deployment(appId=app_id, branchName=branch_name, jobId=job_id)
    summary = res.get('jobSummary', {})
    print(f"Deployment started! Status: {summary.get('status')}")

    print("Polling deployment status...")
    for _ in range(30):
        time.sleep(3)
        job = amp.get_job(appId=app_id, branchName=branch_name, jobId=job_id)
        status = job['job']['summary']['status']
        print(f"Current status: {status}")
        if status in ['SUCCEED', 'FAILED', 'CANCELLED']:
            break

    if status == 'SUCCEED':
        print("\nDeployment succeeded! Visit: https://main.d14utztk41y058.amplifyapp.com")
    else:
        print(f"\nDeployment ended with status: {status}")

if __name__ == '__main__':
    deploy()

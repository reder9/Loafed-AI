FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy application files
COPY . ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "app.handler" ]

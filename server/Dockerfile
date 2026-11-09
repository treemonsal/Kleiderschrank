FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 mystyle
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=mystyle:mystyle . /app
USER mystyle
ENV HF_HUB_DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 PYTHONUNBUFFERED=1 HF_HOME=/home/mystyle/.cache/huggingface U2NET_HOME=/home/mystyle/.cache/rembg OMP_NUM_THREADS=2
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--no-access-log"]

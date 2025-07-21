FROM continuumio/miniconda3:latest

WORKDIR /app

# Install IfcOpenShell via conda
RUN conda update -n base conda && \
    conda install -c conda-forge -c ifcopenshell ifcopenshell python=3.11 -y

# Install additional Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir $(grep -v ifcopenshell requirements.txt)

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
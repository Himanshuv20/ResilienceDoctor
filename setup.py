from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="resilience-doctor",
    version="0.1.0",
    author="ResilienceDoctor Contributors",
    description="A tool for implementing and monitoring resilience patterns in applications",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Himanshuv20/ResilienceDoctor",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
    install_requires=[
        "click>=8.0.0",
        "pyyaml>=5.4.0",
    ],
    entry_points={
        "console_scripts": [
            "resilience-doctor=resilience_doctor.cli:main",
        ],
    },
)

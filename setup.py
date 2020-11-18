from setuptools import setup, find_packages

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name="visual-text-explorer",
    version="0.1.6",
    author="Sonia Castelo",
    author_email="s.castelo@nyu.edu",
    description="Visual Text Explorer tool. Enables the exploration and text analysis through word frequency and named entity recognition in Jupyter Notebooks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/soniacq/TextExplorer",
    packages=find_packages(exclude=['js', 'node_modules']),
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: BSD License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
    install_requires=[
        "python-dateutil",
        "numpy",
        "scipy",
        "scikit-learn",
        "notebook",
        "pandas",
        "nltk",
        "spacy"
    ]
)

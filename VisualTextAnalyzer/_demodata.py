import pkg_resources
import datamart_profiler

def get_lifeexpectancy_data():
    data_path = pkg_resources.resource_filename(__name__, "data/lifeexpectancydata.csv")
    metadata = datamart_profiler.process_dataset(data_path, include_sample=True, plots=True)
    return metadata
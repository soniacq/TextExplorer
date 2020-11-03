import pkg_resources
import datamart_profiler
import pandas as pd
def get_yelp_labelled_data():
    data_path = pkg_resources.resource_filename(__name__, "data/yelp_labelled_sample.csv")
    yelp_data = pd.read_csv(data_path)
    return yelp_data
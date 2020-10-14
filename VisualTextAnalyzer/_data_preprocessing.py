import pkg_resources
import string
import numpy as np
from dateutil.parser import parse
import json
from ._comm_api import setup_comm_api
from collections import defaultdict
import copy
import random

def id_generator(size=15):
    """Helper function to generate random div ids. This is useful for embedding
    HTML into ipython notebooks."""
    chars = list(string.ascii_uppercase)
    return ''.join(np.random.choice(chars, size, replace=True))


def make_html(data_dict, id):
	lib_path = pkg_resources.resource_filename(__name__, "build/textExplorer.js")
	bundle = open(lib_path, "r", encoding="utf8").read()
	html_all = """
	<html>
	<head>
	</head>
	<body>
	    <script>
	    {bundle}
	    </script>
	    <div id="{id}">
	    </div>
	    <script>
	        textExplorer.renderProfilerViewBundle("#{id}", {data_dict});
	    </script>
	</body>
	</html>
	""".format(bundle=bundle, id=id, data_dict=json.dumps(data_dict))
	return html_all

def getSample(text):
    lines = text.split('\n')
    result = []
    for line in lines:
        if line is not '':
            row = line.split(',')
            result.append(row)
    return result

def prepare_data(data, enet_alpha=0.001, enet_l1=0.1):
    data = copy.deepcopy(data)
    word_data = data["words"]
    word_data_JSON = []
    entity_data = data["entities"]
    word_data_JSON = []
    entity_data_JSON = []
    word_cont = 0

    for el in word_data:
        if (word_cont < 15):
            row_pos = {
                "word": el["word"],
                "category":"freq_abs_pos",
                "normalized_frequency":el["freq_nor_pos"],
                "frequency":el["freq_abs_pos"],
                "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                "sample": el["samples_pos"]
            }
            word_data_JSON.append(row_pos)
            row_neg = {
                "word": el["word"],
                "category":"freq_abs_neg",
                "normalized_frequency":el["freq_nor_neg"],
                "frequency":el["freq_abs_neg"],
                "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                "sample": el["samples_neg"]
            }
            word_data_JSON.append(row_neg)
            word_cont += 1

    for key in data["entities"].keys():
        if (key == 'ORGANIZATION' or key == 'PERSON' or key == 'CITY/COUNTRY' ):
            entity_cont = 0
            for el in data["entities"][key]:
                if (entity_cont < 10):
                    row_pos = {
                        "entity_type": key,
                        "word": el["word"],
                        "category":"freq_abs_pos",
                        "normalized_frequency":el["freq_nor_pos"],
                        "frequency":el["freq_abs_pos"],
                        "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                        "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                        "sample": el["samples_pos"]
                    }
                    entity_data_JSON.append(row_pos)
                    row_neg = {
                        "entity_type": key,
                        "word": el["word"],
                        "category":"freq_abs_neg",
                        "normalized_frequency":el["freq_nor_neg"],
                        "frequency":el["freq_abs_neg"],
                        "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                        "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                        "sample": el["samples_neg"]
                    }
                    entity_data_JSON.append(row_neg)
                    entity_cont += 1
            
    search_results = {
        "id": str(random.randint(0, 10)),
        "words": word_data_JSON,
        "entities": entity_data_JSON,
    }
    return search_results

def plot_text_summary(data):
    from IPython.core.display import display, HTML
    id = id_generator()
    data_dict = prepare_data(data)
    html_all = make_html(data_dict, id)
    display(HTML(html_all))

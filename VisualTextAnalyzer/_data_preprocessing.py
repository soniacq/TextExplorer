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


def get_words_frequency(texts, label):
    print('Analyzing %d documents (%s category)' % (len(texts), label))
    stopwords = nltk.corpus.stopwords.words('english')
    all_words = {}
    total_words = 0
    for idx, text in enumerate(texts):
        words = nltk.word_tokenize(text)
        filtered_words = [word for word in words if word.lower() not in stopwords and len(word)>1]
        for filtered_word in filtered_words:
            if filtered_word not in all_words:
                all_words[filtered_word] = {'word': filtered_word, 'category': label, 'frequency': 0, 'normalized_frequency': 0, 'samples': []}

            all_words[filtered_word]['frequency'] += 1
            if idx not in all_words[filtered_word]['samples']:
                all_words[filtered_word]['samples'].append(idx)
            total_words += 1

    sorted_frequencies = []
    for word_data in sorted(all_words.values(), key= lambda x:x['frequency'], reverse=True):
        word_data['normalized_frequency'] = round(word_data['frequency']/total_words, 5)
        sorted_frequencies.append(word_data)

    return sorted_frequencies


def join_frequencies(positive_words, negative_words, labels):
    positive_frequencies = {w['word']: w for w in positive_words}
    negative_frequencies = {w['word']: w for w in negative_words}

    all_words = []
    for word in set(list(positive_frequencies.keys()) + list(negative_frequencies.keys())):
        pos = {}
        neg = {}
        if word in positive_frequencies:
            pos = positive_frequencies[word]
        else:
            pos = {'word': word, 'category': labels['pos'], 'frequency': 0, 'normalized_frequency': 0, 'samples': []}
        if word in negative_frequencies:
            neg = negative_frequencies[word]
        else:
            neg = {'word': word, 'category': labels['neg'], 'frequency': 0, 'normalized_frequency': 0, 'samples': []}

        frequency_difference = abs(pos["frequency"]-neg["frequency"])
        normalized_frequency_difference = abs(pos["normalized_frequency"]-neg["normalized_frequency"])
        pos['frequency_diff_pos_neg'] = frequency_difference
        neg['frequency_diff_pos_neg'] = frequency_difference
        pos['normalized_frequency_diff_pos_neg'] = normalized_frequency_difference
        neg['normalized_frequency_diff_pos_neg'] = normalized_frequency_difference
        all_words.append(pos)
        all_words.append(neg)
    return all_words


def get_top_words (data, top_words):
    positive_class = data[data['articleofinterest']==1]
    negative_class = data[data['articleofinterest']==0]

    positive_texts = [str(x) for x in positive_class['article'].tolist()] # list of texts
    negative_texts = [str(x) for x in negative_class['article'].tolist()] # list of texts

    labels = {'pos': 'positive', 'neg': 'negative'}
    positive_words = get_words_frequency(positive_texts, labels['pos'])
    negative_words = get_words_frequency(negative_texts, labels['neg'])

    # retrieve just the  'X' top more frequent words.
    top = top_words
    top_positive_words = positive_words[:top]
    top_negative_words = negative_words[:top]

    all_words = join_frequencies(top_positive_words, top_negative_words, labels)
    return all_words


def prepare_data(data, enet_alpha=0.001, enet_l1=0.1):
    data = copy.deepcopy(data)
    word_data = data["words"]
    word_data_JSON = []
    entity_data = data["entities"]
    word_data_JSON = []
    entity_data_JSON = []
    word_cont = 0

    for el in word_data:
        if (word_cont < 10):
            row_pos = {
                "word": el["word"],
                "category":"positive",
                "normalized_frequency":el["freq_nor_pos"],
                "frequency":el["freq_abs_pos"],
                "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                "samples": el["samples_pos"]
            }
            word_data_JSON.append(row_pos)
            row_neg = {
                "word": el["word"],
                "category":"negative",
                "normalized_frequency":el["freq_nor_neg"],
                "frequency":el["freq_abs_neg"],
                "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                "samples": el["samples_neg"]
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
                        "category":"positive",
                        "normalized_frequency":el["freq_nor_pos"],
                        "frequency":el["freq_abs_pos"],
                        "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                        "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                        "samples": el["samples_pos"]
                    }
                    entity_data_JSON.append(row_pos)
                    row_neg = {
                        "entity_type": key,
                        "word": el["word"],
                        "category":"negative",
                        "normalized_frequency":el["freq_nor_neg"],
                        "frequency":el["freq_abs_neg"],
                        "normalized_frequency_diff_pos_neg": abs(el["freq_nor_pos"]-el["freq_nor_neg"]),
                        "frequency_diff_pos_neg": abs(el["freq_abs_pos"]-el["freq_abs_neg"]),
                        "samples": el["samples_neg"]
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


def get_words_frequency(texts):
    print('Analyzing %d documents' % len(texts))
    stopwords = nltk.corpus.stopwords.words('english')
    all_words = {}
    total_words = 0
    for text in texts:
        words = nltk.word_tokenize(text)
        filtered_words = [word for word in words if word.lower() not in stopwords and len(word)>1]
        for filtered_word in filtered_words:
            if filtered_word not in all_words:
                all_words[filtered_word] = {'word': filtered_word, 'freq_abs': 0, 'freq_nor': 0, 'samples': []}
                
            all_words[filtered_word]['freq_abs'] += 1
            if len(all_words[filtered_word]['samples']) <= 10:
                all_words[filtered_word]['samples'].append(text)
            total_words += 1
            
    sorted_frequencies = []
    for word_data in sorted(all_words.values(), key= lambda x:x['freq_abs'], reverse=True):
        word_data['freq_nor'] = round(word_data['freq_abs']/total_words, 5)
        sorted_frequencies.append(word_data)
    
    return sorted_frequencies


def get_entities_frequency(texts):
    print('Analyzing %d documents' % len(texts))
    alias = {'ORG':'ORGANIZATION', 'LOC':'PLACE', 'GPE':'CITY/COUNTRY', 'NORP':'GROUP', 'FAC':'BUILDING'}
    unique_entities = {}

    for doc in nlp.pipe(texts, n_threads=16, batch_size=100):
        for entity in doc.ents:
            if entity.label_ in {'CARDINAL', 'ORDINAL', 'QUANTITY'}:
                continue
            entity_type = alias.get(entity.label_, entity.label_)
            entity_name = entity.text
            if entity_name in {'Deir Ezzor', 'Daraa', 'Idlib', 'Aleppo'}:
                entity_type = 'CITY/COUNTRY'
            if entity_type not in unique_entities:
                unique_entities[entity_type] = {}
            if entity_name not in unique_entities[entity_type]:
                unique_entities[entity_type][entity_name] = {'word': entity_name, 'freq_abs': 0, 'freq_nor': 0, 'samples': []}
                
            unique_entities[entity_type][entity_name]['freq_abs'] += 1
            
            if len(unique_entities[entity_type][entity_name]['samples']) <= 10:
                unique_entities[entity_type][entity_name]['samples'].append(doc.text)
            
    for entity_type in unique_entities.keys():
        total_words = sum([x['freq_abs'] for x in unique_entities[entity_type].values()])
        sorted_frequencies = []
        for word_data in sorted(unique_entities[entity_type].values(), key= lambda x:x['freq_abs'], reverse=True):
            word_data['freq_nor'] = round(word_data['freq_abs']/total_words, 5)
            sorted_frequencies.append(word_data)
        unique_entities[entity_type] = sorted_frequencies
    return unique_entities


def join_frequencies(positive_words, negative_words):
    positive_frequencies = {w['word']: w for w in positive_words}
    negative_frequencies = {w['word']: w for w in negative_words}
    all_words = {}
    
    for word in set(list(positive_frequencies.keys()) + list(negative_frequencies.keys())):
        all_words[word] = {'word': word, 'freq_abs_pos': 0, 'freq_nor_pos': 0, 'samples_pos': [],
                           'freq_abs_neg': 0, 'freq_nor_neg': 0, 'samples_neg': []}
        if word in positive_frequencies:
            all_words[word]['freq_abs_pos'] = positive_frequencies[word]['freq_abs']
            all_words[word]['freq_nor_pos'] = positive_frequencies[word]['freq_nor']
            all_words[word]['samples_pos'] = positive_frequencies[word]['samples']
        if word in negative_frequencies:
            all_words[word]['freq_abs_neg'] = negative_frequencies[word]['freq_abs']
            all_words[word]['freq_nor_neg'] = negative_frequencies[word]['freq_nor']
            all_words[word]['samples_neg'] = negative_frequencies[word]['samples']
        
        all_words[word]['freq_total'] = all_words[word]['freq_nor_pos'] + all_words[word]['freq_nor_neg']
            
        
    all_words_sorted = sorted(all_words.values(), key= lambda x:x['freq_total'], reverse=True)
    
    return all_words_sorted
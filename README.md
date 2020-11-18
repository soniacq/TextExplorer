# TextExplorer

VisualTextAnalyzer help users to understand the text data. It includes word frequency analysis and named entities recognition, which help users to explore the fundamental characteristics of the text data. We use bar charts to create the visualizations integrated with the Jupyter Notebook environment. Word frequency analysis is a frequent task in text analytics. Word frequency measures the most frequently occurring words in a given text. Common stopwords like ‘to’, ‘in’, ‘for’, were removed for the word frequency analysis. Named entity recognition is an information extraction method. The entities that are present in the text are classified into predefined entity types like ‘Person’, ‘Organization’, ‘City’, etc.  By using this method, users can get great insights into the types of entities present in the given textual dataset.

![Visual Text Analyzer](https://github.com/soniacq/TextExplorer/blob/master/imgs/plot_text_summary_v2.png)

## Text Exploration

In Jupyter Notebook:
~~~~
import VisualTextAnalyzer
import pandas as pd
data = pd.read_csv('yelp_labelled_sample.csv')
VisualTextAnalyzer.plot_text_summary(data, category_column='category', text_column='comments')
~~~~

## Demo

In Jupyter Notebook::
~~~~
import VisualTextAnalyzer
yelp_data = VisualTextAnalyzer.get_yelp_labelled_data()
VisualTextAnalyzer.plot_text_summary(yelp_data, category_column='category', text_column='comments')
~~~~

## Export Texts

You might want to export a subset of selected texts for further analyses. To do so, use the following code (after exporting it through the UI):

~~~~
obj_text = VisualTextAnalyzer.get_exported_texts()
~~~~

The returned object has the following attributes: 
- texts: List of texts.
- category: All texts belong to that category.
- word: All texts contain that word.
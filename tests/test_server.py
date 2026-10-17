import io
import unittest
import zipfile
from server import analyze, extract


class ComparisonTests(unittest.TestCase):
    paper = 'These seven original words form a matching passage in this student project with additional original discussion.'

    def test_exact_match_and_duplicate_sources_do_not_double_count(self):
        result = analyze(self.paper,[{'name':'one','text':self.paper},{'name':'two','text':self.paper}])
        self.assertEqual(result['similarity'],100)
        self.assertEqual(result['matchedWords'],result['wordCount'])
        self.assertEqual(result['sources'][0]['passages'][0]['text'],self.paper[:-1])

    def test_absent_sources_are_not_zero_similarity(self):
        self.assertIsNone(analyze(self.paper,[])['similarity'])

    def test_unrelated_reference(self):
        result=analyze(self.paper,[{'text':'A completely different reference with nothing shared from the provided work.'}])
        self.assertEqual(result['similarity'],0)
        self.assertFalse(result['writing']['enoughText'])

    def test_partial_match(self):
        result=analyze(self.paper,[{'text':'These seven original words form a matching'}])
        self.assertEqual(result['matchedWords'],7)
        self.assertEqual(result['sources'][0]['passages'][0]['text'],'These seven original words form a matching')

    def test_reject_invalid_input(self):
        for text in [None,'short','x'*200001]:
            with self.assertRaises(ValueError): analyze(text,[])

    def test_docx_extraction(self):
        data=io.BytesIO()
        with zipfile.ZipFile(data,'w') as z:
            z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>My project text</w:t></w:r></w:p></w:body></w:document>')
        self.assertEqual(extract(data.getvalue(),'project.docx'),'My project text')

    def test_text_extraction(self):
        self.assertEqual(extract(b'\xef\xbb\xbfProject text','paper.txt'),'Project text')


if __name__=='__main__': unittest.main()

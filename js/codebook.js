// 248 Arena — Code Book Search & Highlight

const CodeBook = {
  init() {
    const input = document.getElementById('codebookSearch');
    if (input) {
      input.addEventListener('input', () => this.search(input.value));
    }
    // Check URL hash for direct code ref link (e.g. "#248 CMR 10.15 Table 1"
    // from a question citation). Normalize to the bare section number so it
    // matches the section title regardless of table/suffix text.
    if (window.location.hash) {
      const raw = decodeURIComponent(window.location.hash.slice(1));
      const m = raw.match(/(\d+)\.(\d+)/);
      const ref = m ? `248 CMR ${m[1]}.${m[2]}` : raw;
      if (ref && input && !document.getElementById(window.location.hash.slice(1))) {
        input.value = ref;
        setTimeout(() => this.search(ref), 300);
      }
    }
    // Section toggle
    document.querySelectorAll('.code-section-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('expanded');
      });
    });
  },

  // Quick-nav helper: expand a section by element id and scroll to it.
  jump(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('expanded');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return false;
  },

  search(query) {
    const q = query.trim().toLowerCase();
    const sections = document.querySelectorAll('.code-section');
    
    if (!q) {
      sections.forEach(s => {
        s.classList.remove('hidden');
        // Remove highlights
        s.querySelectorAll('.code-text').forEach(ct => {
          ct.innerHTML = ct.innerHTML.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
        });
      });
      return;
    }

    let firstMatch = null;
    sections.forEach(section => {
      const title = section.querySelector('.code-section-title')?.textContent.toLowerCase() || '';
      const body = section.querySelector('.code-text');
      const bodyText = body?.textContent.toLowerCase() || '';
      
      if (title.includes(q) || bodyText.includes(q)) {
        section.classList.remove('hidden');
        section.classList.add('expanded');
        if (!firstMatch) firstMatch = section;
        
        // Highlight matches in body
        if (body) {
          const origHTML = body.innerHTML.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
          const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          body.innerHTML = origHTML.replace(regex, '<mark>$1</mark>');
        }
      } else {
        section.classList.add('hidden');
      }
    });

    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => CodeBook.init());

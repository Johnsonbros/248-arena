// 248 Arena — Code Book Search & Highlight

const CodeBook = {
  init() {
    const input = document.getElementById('codebookSearch');
    if (input) {
      input.addEventListener('input', () => this.search(input.value));
    }
    // Check URL hash for direct code ref link
    if (window.location.hash) {
      const ref = decodeURIComponent(window.location.hash.slice(1));
      if (ref && input) {
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

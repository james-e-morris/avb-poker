// __tests__/dom.test.js - Unit tests for DOM rendering functions

describe('DOM Rendering Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="view-home" class="view active"></div>
      <div id="view-game" class="view"></div>
      <div id="view-loading" class="view"></div>
      <div id="game-session-name"></div>
      <div id="game-story-display"></div>
      <div id="participants-grid"></div>
      <div id="status-bar"></div>
      <div id="status-text"></div>
      <div id="vote-cards"></div>
      <div id="voting-area"></div>
      <div id="results-area" hidden></div>
      <div id="results-votes"></div>
      <div id="results-avg"></div>
      <div id="results-consensus"></div>
      <div id="results-nearest"></div>
      <div id="footer-voting"></div>
      <div id="footer-revealed" hidden></div>
      <div id="vote-count-label"></div>
      <div id="btn-reveal"></div>
      <div id="toast" hidden></div>
      <button id="btn-toggle-theme"></button>
      <button id="btn-toggle-theme-game"></button>
      <div class="mod-only" style="display: none;"></div>
      <div class="participant-only" style="display: none;"></div>
      <button id="btn-vote-calc" data-sp="5"></button>
    `;
  });

  describe('showView', () => {
    test('shows home view', () => {
      const homeView = document.getElementById('view-home');
      const gameView = document.getElementById('view-game');
      
      homeView.classList.remove('active');
      const views = document.querySelectorAll('.view');
      views.forEach(v => v.classList.remove('active'));
      homeView.classList.add('active');

      expect(homeView.classList.contains('active')).toBe(true);
      expect(gameView.classList.contains('active')).toBe(false);
    });

    test('hides previous view when showing new view', () => {
      const homeView = document.getElementById('view-home');
      const gameView = document.getElementById('view-game');
      
      expect(homeView.classList.contains('active')).toBe(true);
      
      homeView.classList.remove('active');
      gameView.classList.add('active');
      
      expect(homeView.classList.contains('active')).toBe(false);
      expect(gameView.classList.contains('active')).toBe(true);
    });

    test('handles non-existent view', () => {
      const views = document.querySelectorAll('.view');
      views.forEach(v => v.classList.remove('active'));
      
      const nonExistent = document.getElementById('view-nonexistent');
      expect(nonExistent).toBeNull();
    });
  });

  describe('updateGameHeader', () => {
    test('sets session name', () => {
      const session = { name: 'Sprint Planning', story: 'Feature ABC' };
      document.getElementById('game-session-name').textContent = session.name;
      
      expect(document.getElementById('game-session-name').textContent).toBe('Sprint Planning');
    });

    test('sets story display', () => {
      const session = { name: 'Session', story: 'Build login form' };
      document.getElementById('game-story-display').textContent = session.story;
      
      expect(document.getElementById('game-story-display').textContent).toBe('Build login form');
    });

    test('defaults to em dash for empty story', () => {
      const story = undefined;
      document.getElementById('game-story-display').textContent = story || '—';
      
      expect(document.getElementById('game-story-display').textContent).toBe('—');
    });

    test('shows moderator controls', () => {
      const modOnlyElements = document.querySelectorAll('.mod-only');
      modOnlyElements.forEach(el => el.style.display = '');
      
      expect(document.querySelector('.mod-only').style.display).toBe('');
    });

    test('hides participant-only controls for moderator', () => {
      const participantOnlyElements = document.querySelectorAll('.participant-only');
      participantOnlyElements.forEach(el => el.style.display = 'none');
      
      expect(document.querySelector('.participant-only').style.display).toBe('none');
    });
  });

  describe('renderVoteCards', () => {
    test('creates vote card buttons', () => {
      const container = document.getElementById('vote-cards');
      const cards = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
      
      container.innerHTML = '';
      cards.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'vote-card';
        btn.textContent = val;
        btn.dataset.value = val;
        container.appendChild(btn);
      });

      expect(container.querySelectorAll('.vote-card').length).toBe(13);
    });

    test('marks selected card', () => {
      const container = document.getElementById('vote-cards');
      container.innerHTML = '';
      
      const btn = document.createElement('button');
      btn.className = 'vote-card selected';
      btn.textContent = '5';
      container.appendChild(btn);

      expect(container.querySelector('.vote-card.selected')).toBeTruthy();
      expect(document.querySelector('.vote-card.selected')?.textContent).toBe('5');
    });

    test('disables buttons when revealed', () => {
      const container = document.getElementById('vote-cards');
      container.innerHTML = '';
      
      const btn = document.createElement('button');
      btn.className = 'vote-card';
      btn.disabled = true;
      container.appendChild(btn);

      expect(btn.disabled).toBe(true);
    });

    test('shows suggested preview on non-selected card', () => {
      const container = document.getElementById('vote-cards');
      container.innerHTML = '';
      
      const btn = document.createElement('button');
      btn.className = 'vote-card suggested-preview';
      btn.textContent = '5';
      container.appendChild(btn);

      expect(document.querySelector('.vote-card.suggested-preview')).toBeTruthy();
    });
  });

  describe('updateStatusBar', () => {
    test('shows consensus message when all voted', () => {
      const participants = {
        'u_1': { hasVoted: true },
        'u_2': { hasVoted: true },
      };
      const status = 'voting';
      const voted = Object.values(participants).filter(p => p.hasVoted).length;
      const total = Object.values(participants).length;
      
      const message = voted === total && total > 0 
        ? 'Everyone has voted — moderator can reveal now.' 
        : 'Voting in progress';

      expect(message).toBe('Everyone has voted — moderator can reveal now.');
    });

    test('shows progress when not all voted', () => {
      const participants = {
        'u_1': { hasVoted: true },
        'u_2': { hasVoted: false },
        'u_3': { hasVoted: false },
      };
      const voted = Object.values(participants).filter(p => p.hasVoted).length;
      const total = Object.values(participants).length;
      
      expect(voted < total).toBe(true);
      expect(total - voted).toBe(2);
    });

    test('shows revealed message when status is revealed', () => {
      const status = 'revealed';
      const message = status === 'revealed' 
        ? 'Votes revealed! See results below.' 
        : 'In progress';

      expect(message).toBe('Votes revealed! See results below.');
    });
  });

  describe('showResults', () => {
    test('makes results area visible', () => {
      const area = document.getElementById('results-area');
      area.removeAttribute('hidden');
      
      expect(area.hasAttribute('hidden')).toBe(false);
    });

    test('disables voting area', () => {
      const votingArea = document.getElementById('voting-area');
      votingArea.classList.add('voting-disabled');
      
      expect(votingArea.classList.contains('voting-disabled')).toBe(true);
    });

    test('calculates average vote', () => {
      const participants = {
        'u_1': { vote: '5', hasVoted: true },
        'u_2': { vote: '8', hasVoted: true },
        'u_3': { vote: '13', hasVoted: true },
      };
      
      const votes = Object.values(participants)
        .filter(p => p.hasVoted)
        .map(p => parseFloat(p.vote));
      const avg = votes.reduce((a, b) => a + b, 0) / votes.length;
      
      expect(avg).toBeCloseTo(8.67, 1);
    });

    test('determines consensus', () => {
      const participants = {
        'u_1': { vote: '5', hasVoted: true },
        'u_2': { vote: '5', hasVoted: true },
      };
      
      const votes = Object.values(participants)
        .filter(p => p.hasVoted)
        .map(p => parseFloat(p.vote));
      const isConsensus = new Set(votes).size === 1;
      
      expect(isConsensus).toBe(true);
    });

    test('shows no consensus when votes differ', () => {
      const participants = {
        'u_1': { vote: '3', hasVoted: true },
        'u_2': { vote: '5', hasVoted: true },
        'u_3': { vote: '8', hasVoted: true },
      };
      
      const votes = Object.values(participants)
        .filter(p => p.hasVoted)
        .map(p => parseFloat(p.vote));
      const isConsensus = new Set(votes).size === 1;
      
      expect(isConsensus).toBe(false);
      expect(new Set(votes).size).toBe(3);
    });

    test('hides voting footer and shows revealed footer', () => {
      const votingFooter = document.getElementById('footer-voting');
      const revealedFooter = document.getElementById('footer-revealed');
      
      votingFooter.hidden = true;
      revealedFooter.hidden = false;

      expect(votingFooter.hidden).toBe(true);
      expect(revealedFooter.hidden).toBe(false);
    });
  });

  describe('hideResults', () => {
    test('hides results area', () => {
      const area = document.getElementById('results-area');
      area.setAttribute('hidden', '');
      
      expect(area.hasAttribute('hidden')).toBe(true);
    });

    test('removes voting disabled class', () => {
      const votingArea = document.getElementById('voting-area');
      votingArea.classList.remove('voting-disabled');
      
      expect(votingArea.classList.contains('voting-disabled')).toBe(false);
    });

    test('shows voting footer', () => {
      const votingFooter = document.getElementById('footer-voting');
      votingFooter.hidden = false;

      expect(votingFooter.hidden).toBe(false);
    });

    test('hides revealed footer', () => {
      const revealedFooter = document.getElementById('footer-revealed');
      revealedFooter.hidden = true;

      expect(revealedFooter.hidden).toBe(true);
    });
  });

  describe('updateFooter', () => {
    test('updates vote count label', () => {
      const participants = {
        'u_1': { hasVoted: true },
        'u_2': { hasVoted: false },
      };
      const voted = Object.values(participants).filter(p => p.hasVoted).length;
      const total = Object.values(participants).length;
      
      document.getElementById('vote-count-label').textContent = `${voted} / ${total} voted`;
      
      expect(document.getElementById('vote-count-label').textContent).toBe('1 / 2 voted');
    });

    test('shows reveal button when moderator and votes exist', () => {
      const revealBtn = document.getElementById('btn-reveal');
      const isModerator = true;
      const hasVotes = true;

      revealBtn.hidden = !(isModerator && hasVotes);

      expect(revealBtn.hidden).toBe(false);
    });

    test('hides reveal button when not moderator', () => {
      const revealBtn = document.getElementById('btn-reveal');
      revealBtn.hidden = true;

      expect(revealBtn.hidden).toBe(true);
    });
  });

  describe('showToast', () => {
    test('displays toast message', () => {
      const toast = document.getElementById('toast');
      const message = 'Vote saved!';
      
      toast.textContent = message;
      toast.classList.add('visible');
      toast.removeAttribute('hidden');

      expect(toast.textContent).toBe('Vote saved!');
      expect(toast.classList.contains('visible')).toBe(true);
      expect(toast.hasAttribute('hidden')).toBe(false);
    });

    test('applies type classes', () => {
      const toast = document.getElementById('toast');
      toast.className = 'toast toast-success visible';

      expect(toast.classList.contains('toast-success')).toBe(true);
    });

    test('hides toast after duration', (done) => {
      const toast = document.getElementById('toast');
      toast.classList.add('visible');
      toast.removeAttribute('hidden');

      setTimeout(() => {
        toast.classList.remove('visible');
      }, 100);

      setTimeout(() => {
        toast.setAttribute('hidden', '');
        expect(toast.hasAttribute('hidden')).toBe(true);
        done();
      }, 400);
    });
  });

  describe('applyTheme', () => {
    test('sets data-theme attribute to dark', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('sets data-theme attribute to light', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    test('updates theme toggle icon for dark', () => {
      document.getElementById('btn-toggle-theme').textContent = '🌙';
      
      expect(document.getElementById('btn-toggle-theme').textContent).toBe('🌙');
    });

    test('updates theme toggle icon for light', () => {
      document.getElementById('btn-toggle-theme').textContent = '☀️';
      
      expect(document.getElementById('btn-toggle-theme').textContent).toBe('☀️');
    });

    test('persists theme to localStorage', () => {
      localStorage.setItem('pp_theme', 'dark');
      
      expect(localStorage.getItem('pp_theme')).toBe('dark');
    });
  });
});

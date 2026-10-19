import { useState } from 'react';
import { BUILTIN_DECKS, deleteDeck, insertDeck, saveSelectionAsDeck, userDecks, type Deck } from '../decks';
import { useGraph } from '../store/graph';
import { useT } from '../i18n';

/** Card decks: click one to spread the whole chain on the canvas. */
export function DecksPanel() {
  const T = useT();
  const [, bump] = useState(0);
  const [name, setName] = useState('');
  const selected = useGraph((s) => s.selected.length);
  const mine = userDecks();
  const tile = (d: Deck) => (
    <div key={d.id} className="tile deck" onClick={() => insertDeck(d)} role="button">
      <b>{d.name}</b><small>{d.note}</small>
      {d.user && <button className="mini" title={T('Delete')} onClick={(e) => { e.stopPropagation(); deleteDeck(d.id); bump((x) => x + 1); }}>✕</button>}
    </div>
  );
  return (
    <div className="panel-body">
      <section>
        <h4>{T('My decks')}</h4>
        <div className="row">
          <input className="panel-search" placeholder={T('Deck name')} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={!selected} title={T('Select cards on the canvas first')} onClick={() => { if (saveSelectionAsDeck(name.trim() || `Deck ${mine.length + 1}`)) { setName(''); bump((x) => x + 1); } }}>{T('Save selection')}</button>
        </div>
        {mine.map(tile)}
        {!mine.length && <small className="muted">{T('Select some cards on the canvas and save them as a deck.')}</small>}
      </section>
      <section><h4>{T('Starter decks')}</h4>{BUILTIN_DECKS.map(tile)}</section>
    </div>
  );
}

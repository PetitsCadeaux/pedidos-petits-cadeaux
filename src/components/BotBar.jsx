import { useEffect, useMemo, useState } from 'react';
import { CFG } from '../config.js';
import { botMensajes } from '../lib/bot.js';

export default function BotBar({ d }) {
  const msgs = useMemo(() => botMensajes(d), [d]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bot">
      <p className="bot-say" key={i % msgs.length}><b>{CFG.bot}:</b> {msgs[i % msgs.length]}</p>
    </div>
  );
}

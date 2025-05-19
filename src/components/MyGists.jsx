// src/components/MyGists.jsx
import React, { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';
import { inferDescriptionFromMarkdown } from '../utils/describeGist';

export default function MyGists({ username, authToken }) {
  const [gists, setGists] = useState([]);

  useEffect(() => {
    // instantiate the client here so it doesn't need to go into deps
    const octokit = new Octokit({ auth: authToken });

    async function load() {
      // 1) Fetch the list (metadata only)
      const { data: list } = await octokit.gists.listForUser({ username });

      // 2) Enrich any with blank description
      const enriched = await Promise.all(
        list.map(async (gist) => {
          if (gist.description?.trim()) return gist;

          // fetch full Gist (includes file.content)
          const { data: full } = await octokit.gists.get({ gist_id: gist.id });
          const firstFile = full.files[Object.keys(full.files)[0]];
          const snippet = inferDescriptionFromMarkdown(firstFile.content ?? '', 12);

          return {
            ...gist,
            description: snippet || '—',
          };
        })
      );

      setGists(enriched);
    }

    load();
  }, [username, authToken]); // <-- only external inputs here

  return (
    <div className="my-gists">
      {gists.map((gist) => (
        <div key={gist.id} className="gist-card">
          <a href={gist.html_url} target="_blank" rel="noopener noreferrer">
            {gist.description || 'No description'}
          </a>
          <div className="meta">
            {Object.keys(gist.files).length} file
            {Object.keys(gist.files).length > 1 && 's'} · Updated{' '}
            {new Date(gist.updated_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function setupGitHubRepo() {
  try {
    console.log('Creating GitHub repository...');
    
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Create repository
    try {
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: 'spelling',
        description: 'Spelling Champions - An interactive educational app for children to improve spelling skills',
        private: false,
        auto_init: false
      });
      
      console.log(`Repository created: ${repo.html_url}`);
      console.log(`Clone URL: ${repo.clone_url}`);
      return repo.clone_url;
    } catch (error: any) {
      if (error.status === 422 && error.message.includes('already exists')) {
        console.log('Repository already exists, using existing repository');
        const { data: repo } = await octokit.rest.repos.get({
          owner: user.login,
          repo: 'spelling'
        });
        return repo.clone_url;
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to setup GitHub repository:', error);
    throw error;
  }
}

setupGitHubRepo()
  .then((cloneUrl) => {
    console.log('\nRepository setup complete!');
    console.log('Clone URL:', cloneUrl);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });

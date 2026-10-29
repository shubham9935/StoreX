import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, clearAccessToken, getAccessToken, setAccessToken } from './services/api'
import './App.css'

const navigation = [
  { name: 'Home', icon: 'home' },
  { name: 'My Drive', icon: 'drive' },
  { name: 'Recent', icon: 'clock' },
]

function fileKind(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (file.mime_type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return 'image'
  if (file.mime_type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (file.mime_type?.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(extension)) return 'sheet'
  if (file.mime_type?.includes('word') || ['doc', 'docx', 'txt'].includes(extension)) return 'doc'
  return 'other'
}

function formatSize(bytes) {
  const value = Number(bytes) || 0
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${value} B`
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function folderColor(name) {
  const colors = ['violet', 'blue', 'orange', 'green']
  return colors[name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]
}

function Icon({ name, size = 20, ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    drive: <><path d="m9 3-7 13h7l7-13z" /><path d="m9 3 7 13h7L16 3z" /><path d="m2 16 3 5h14l4-5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m7 10 5 5 5-5" />,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sort: <><path d="M4 7h16M7 12h10m-7 5h4" /><path d="m18 4 2 3-2 3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 4m0 3h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L5.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2z" transform="translate(1 0) scale(.9)" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    cloud: <><path d="M20 16.2A4.5 4.5 0 0 0 18.5 8a6.5 6.5 0 0 0-12.6 1.8A4 4 0 0 0 6 18h12a4 4 0 0 0 2-1.8z" /><path d="M12 12v7m-3-3 3 3 3-3" /></>,
    download: <><path d="M12 4v12m-5-5 5 5 5-5" /><path d="M4 20h16" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  }

  return <svg {...common}>{paths[name] || paths.file}</svg>
}

function FileBadge({ kind, large = false }) {
  const labels = { pdf: 'PDF', sheet: 'XLS', doc: 'DOC', image: 'IMG', other: 'FILE' }
  return (
    <span className={`file-badge file-badge--${kind} ${large ? 'file-badge--large' : ''}`}>
      {kind === 'image' ? <span className="image-preview" /> : <><Icon name="file" size={large ? 30 : 21} /><b>{labels[kind] || labels.other}</b></>}
    </span>
  )
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    let accountCreated = false
    try {
      if (mode === 'register') {
        await api.register({ name, email, password })
        accountCreated = true
      }
      const result = await api.login({ email, password })
      setAccessToken(result.token)
      onAuthenticated(result.user)
    } catch (requestError) {
      if (accountCreated) {
        setMode('login')
        setError('Your account was created. Sign in with your new credentials.')
      } else {
        setError(requestError.message || 'Unable to reach StoreX. Check that the backend is running.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark"><Icon name="drive" size={23} /></span><span>Store<span className="brand-light">X</span></span></div>
        <div className="auth-intro">
          <div className="eyebrow">YOUR FILES, YOUR SPACE</div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>{mode === 'login' ? 'Sign in to securely access your StoreX drive.' : 'Set up a private drive for your files.'}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Full name
              <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email address
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
          </label>
          {mode === 'register' && <p className="password-hint">Use at least 8 characters with uppercase, lowercase, and a number.</p>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'New to StoreX?' : 'Already have an account?'}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button>
        </p>
        <div className="auth-security"><Icon name="cloud" size={15} /> Your files are private to your account</div>
      </section>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(getAccessToken()))
  const [activePage, setActivePage] = useState('Home')
  const [query, setQuery] = useState('')
  const [layout, setLayout] = useState('grid')
  const [sortBy, setSortBy] = useState('Last modified')
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [currentFolder, setCurrentFolder] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editName, setEditName] = useState('')
  const [menuTarget, setMenuTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const fileInput = useRef(null)
  const folderInput = useRef(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }, [])

  const signOut = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setFiles([])
    setFolders([])
    setRecentFiles([])
    setCurrentFolder(null)
    setBreadcrumbs([])
    setQuery('')
    setActivePage('Home')
  }, [])

  useEffect(() => {
    let active = true
    const token = getAccessToken()
    if (!token) return () => { active = false }

    api.currentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {
        if (active) {
          clearAccessToken()
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return undefined

    let active = true
    const searchTerm = query.trim()

    async function loadData() {
      setLoading(true)
      setLoadError('')
      try {
        let nextFiles = []
        let nextFolders = []
        let nextRecent = []
        if (searchTerm.length >= 2) {
          const result = await api.search(searchTerm)
          nextFiles = result.files
          nextFolders = result.folders
        } else if (activePage === 'Recent') {
          const result = await api.recentFiles()
          nextFiles = result.files
        } else {
          const [folderResult, fileResult] = await Promise.all([
            api.listFolders(currentFolder?.id || null),
            activePage === 'Home'
              ? api.recentFiles()
              : api.listFiles(currentFolder?.id || null),
          ])
          nextFolders = folderResult.folders
          nextFiles = fileResult.files
          if (activePage === 'Home') nextRecent = fileResult.files
        }
        if (!active) return
        setFiles(nextFiles)
        setFolders(nextFolders)
        setRecentFiles(nextRecent)
      } catch (requestError) {
        if (!active) return
        if (requestError.status === 401) {
          signOut()
          return
        }
        setLoadError(requestError.message || 'Could not load your files.')
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = window.setTimeout(loadData, searchTerm.length === 1 ? 250 : 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [activePage, currentFolder, query, refreshKey, signOut, user])

  const filteredFiles = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()
    const result = files.filter((file) => !searchTerm || file.name.toLowerCase().includes(searchTerm))
    if (sortBy === 'Name') result.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'File size') result.sort((a, b) => Number(b.size_bytes) - Number(a.size_bytes))
    if (sortBy === 'Last modified') result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    return result
  }, [files, query, sortBy])

  const visibleFolders = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()
    const result = folders.filter((folder) => !searchTerm || folder.name.toLowerCase().includes(searchTerm))
    if (sortBy === 'Name') result.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'Last modified') result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    return result
  }, [folders, query, sortBy])

  function navigate(page) {
    setActivePage(page)
    setCurrentFolder(null)
    setBreadcrumbs([])
    setQuery('')
    setMenuTarget(null)
  }

  function openFolder(folder) {
    setCurrentFolder(folder)
    setBreadcrumbs((current) => [...current, folder])
    setActivePage('My Drive')
    setQuery('')
    setMenuTarget(null)
  }

  function goToBreadcrumb(index) {
    if (index < 0) {
      setCurrentFolder(null)
      setBreadcrumbs([])
    } else {
      setCurrentFolder(breadcrumbs[index])
      setBreadcrumbs((current) => current.slice(0, index + 1))
    }
    setActivePage('My Drive')
  }

  function refresh() {
    setRefreshKey((key) => key + 1)
  }

  function showRequestError(requestError) {
    if (requestError.status === 401) {
      signOut()
      return
    }
    showToast(requestError.message || 'The request could not be completed.')
  }

  async function createFolder(event) {
    event.preventDefault()
    const name = folderName.trim()
    if (!name) return
    setBusy(true)
    try {
      await api.createFolder(name, currentFolder?.id || null)
      setFolderName('')
      setShowFolderDialog(false)
      showToast(`“${name}” created`)
      refresh()
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setBusy(false)
    }
  }

  async function uploadFiles(event) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selected.length) return
    setBusy(true)
    let uploaded = 0
    let lastError = null
    try {
      for (const file of selected) {
        try {
          await api.uploadFile(file, currentFolder?.id || null)
          uploaded += 1
        } catch (requestError) {
          lastError = requestError
        }
      }
      refresh()
      if (uploaded) showToast(`${uploaded} ${uploaded === 1 ? 'file uploaded' : 'files uploaded'}`)
      if (lastError) showRequestError(lastError)
    } finally {
      setBusy(false)
    }
  }

  async function downloadFile(file) {
    try {
      const blob = await api.downloadFile(file.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      showRequestError(requestError)
    }
  }

  function startRename(target) {
    setEditTarget(target)
    setEditName(target.name)
    setMenuTarget(null)
  }

  async function saveRename(event) {
    event.preventDefault()
    const name = editName.trim()
    if (!name || !editTarget) return
    setBusy(true)
    try {
      if (editTarget.type === 'folder') await api.renameFolder(editTarget.id, name)
      else await api.renameFile(editTarget.id, name)
      setEditTarget(null)
      showToast('Name updated')
      refresh()
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(target) {
    setMenuTarget(null)
    const confirmed = window.confirm(`Delete “${target.name}”?`)
    if (!confirmed) return
    setBusy(true)
    try {
      if (target.type === 'folder') await api.deleteFolder(target.id)
      else await api.deleteFile(target.id)
      showToast('Item deleted')
      refresh()
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setBusy(false)
    }
  }

  function chooseNew(action) {
    setShowNewMenu(false)
    if (action === 'folder') setShowFolderDialog(true)
    if (action === 'upload') fileInput.current?.click()
  }

  if (authLoading) {
    return <main className="auth-loading"><span className="loading-spinner" />Checking your session…</main>
  }

  if (!user) return <AuthScreen onAuthenticated={setUser} />

  const pageTitle = activePage === 'Home' ? 'Good morning' : activePage
  const showQuickAccess = activePage === 'Home' && !query && recentFiles.length > 0
  const fileOwner = user.name || user.display_name || user.email

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('Home') }}>
          <span className="brand-mark"><Icon name="drive" size={23} /></span>
          <span>Store<span className="brand-light">X</span></span>
        </a>

        <div className="sidebar-new-wrap">
          <button className="new-button" onClick={() => setShowNewMenu((open) => !open)} disabled={busy}>
            <Icon name="plus" size={21} /><span>New</span><Icon name="down" size={16} />
          </button>
          {showNewMenu && (
            <div className="new-menu">
              <button onClick={() => chooseNew('folder')}><Icon name="folder" size={18} /> New folder</button>
              <button onClick={() => chooseNew('upload')}><Icon name="upload" size={18} /> Upload files</button>
            </div>
          )}
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button key={item.name} className={`nav-item ${activePage === item.name ? 'active' : ''}`} onClick={() => navigate(item.name)}>
              <Icon name={item.icon} size={19} /><span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="storage-meter account-note"><Icon name="cloud" size={18} /><p>Your files are private to your account.</p></div>

        <div className="sidebar-bottom">
          <span className="avatar avatar--small">{fileOwner.charAt(0).toUpperCase()}</span>
          <div><strong>{fileOwner}</strong><span>{user.email}</span></div>
          <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="logout" size={18} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <label className="search-box">
            <Icon name="search" size={21} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in your drive" />
            {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={17} /></button>}
            <button type="button" className="search-options" aria-label="Search options" onClick={() => showToast('Search across your files and folders')}><span /><span /><span /></button>
          </label>
          <div className="top-actions">
            <button className="icon-button help-button" aria-label="Help" onClick={() => showToast('StoreX securely stores files in your account')}><Icon name="help" /></button>
            <button className="icon-button settings-button" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="logout" /></button>
            <button className="avatar" aria-label={`Sign out ${fileOwner}`} title="Sign out" onClick={signOut}>{fileOwner.charAt(0).toUpperCase()}</button>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">{activePage === 'Home' ? 'YOUR WORKSPACE' : 'STOREX DRIVE'}</div>
              <h1>{pageTitle}{activePage === 'Home' && <span>, {fileOwner.split(' ')[0]}</span>}</h1>
              <p className="welcome-caption">{activePage === 'Home' ? 'Everything in your personal drive, all in one place.' : `Browse and manage your ${activePage.toLowerCase()}.`}</p>
            </div>
            <button className="upload-button" onClick={() => fileInput.current?.click()} disabled={busy}><Icon name="upload" size={18} /> {busy ? 'Working…' : 'Upload files'}</button>
          </div>

          {showQuickAccess && (
            <section className="quick-section">
              <div className="section-heading">
                <h2>Quick access</h2>
                <button className="subtle-button" onClick={() => navigate('Recent')}>View all <Icon name="chevron" size={16} /></button>
              </div>
              <div className="quick-grid">
                {recentFiles.slice(0, 3).map((file) => (
                  <button className="quick-card" key={file.id} onClick={() => downloadFile(file)}>
                    <div className={`quick-preview quick-preview--${fileKind(file)}`}>
                      {fileKind(file) === 'image' ? <div className="preview-art"><span /><i /><b /></div> : <FileBadge kind={fileKind(file)} large />}
                      <span className="preview-open"><Icon name="download" size={17} /></span>
                    </div>
                    <div className="quick-card-info">
                      <FileBadge kind={fileKind(file)} />
                      <div><strong>{file.name}</strong><span>{formatDate(file.updated_at)}</span></div>
                      <Icon name="more" size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="drive-section">
            <div className="section-heading file-heading">
              <div className="heading-with-count">
                <h2>{query.trim().length >= 2 ? 'Search results' : currentFolder?.name || (activePage === 'Home' ? 'Recent files' : activePage === 'Recent' ? 'Recent files' : 'My Drive')}</h2>
                <span className="file-count">{filteredFiles.length + visibleFolders.length}</span>
              </div>
              <div className="view-controls">
                <label className="sort-control"><Icon name="sort" size={17} /><select aria-label="Sort files" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option>Last modified</option><option>Name</option><option>File size</option></select></label>
                <span className="control-divider" />
                <div className="view-toggle" aria-label="View options">
                  <button className={layout === 'list' ? 'selected' : ''} aria-label="List view" onClick={() => setLayout('list')}><Icon name="list" size={18} /></button>
                  <button className={layout === 'grid' ? 'selected' : ''} aria-label="Grid view" onClick={() => setLayout('grid')}><Icon name="grid" size={17} /></button>
                </div>
              </div>
            </div>

            {(activePage === 'My Drive' || query.trim().length >= 2) && (
              <div className="breadcrumbs">
                <button onClick={() => goToBreadcrumb(-1)}>My Drive</button>
                {breadcrumbs.map((folder, index) => (
                  <span className="breadcrumb-part" key={folder.id}><Icon name="chevron" size={15} /><button onClick={() => goToBreadcrumb(index)}>{folder.name}</button></span>
                ))}
                {query.trim().length >= 2 && <span className="breadcrumb-part"><Icon name="chevron" size={15} /><span>Search: {query}</span></span>}
              </div>
            )}

            {loadError && <div className="load-error" role="alert"><span>{loadError}</span><button onClick={refresh}>Try again</button></div>}
            {loading ? (
              <div className="data-loading"><span className="loading-spinner" />Loading your files…</div>
            ) : (
              <>
                {visibleFolders.length > 0 && (
                  <div className="folder-grid">
                    {visibleFolders.map((folder) => (
                      <div className="folder-card-wrap" key={folder.id}>
                        <button className="folder-card" onClick={() => openFolder(folder)}>
                          <span className={`folder-icon folder-icon--${folderColor(folder.name)}`}><Icon name="folder" size={21} /></span>
                          <span className="folder-name">{folder.name}</span>
                        </button>
                        <button className="folder-more" aria-label={`More options for ${folder.name}`} onClick={() => setMenuTarget(menuTarget?.id === folder.id ? null : { type: 'folder', id: folder.id, name: folder.name })}><Icon name="more" size={18} /></button>
                        {menuTarget?.id === folder.id && <ItemMenu onRename={() => startRename({ type: 'folder', ...folder })} onDelete={() => deleteItem({ type: 'folder', ...folder })} />}
                      </div>
                    ))}
                  </div>
                )}

                {filteredFiles.length > 0 ? (
                  layout === 'grid' ? (
                    <div className="file-grid">
                      {filteredFiles.map((file) => (
                        <article className="file-card" key={file.id}>
                          <button className={`file-preview file-preview--${fileKind(file)}`} onClick={() => downloadFile(file)} aria-label={`Download ${file.name}`}>
                            {fileKind(file) === 'image' ? <div className="preview-art"><span /><i /><b /></div> : <FileBadge kind={fileKind(file)} large />}
                          </button>
                          <div className="file-card-info">
                            <FileBadge kind={fileKind(file)} />
                            <div className="file-name-block"><strong title={file.name}>{file.name}</strong><span>{formatDate(file.updated_at)} <span className="meta-dot">·</span> {formatSize(file.size_bytes)}</span></div>
                            <button className="icon-button file-more" aria-label={`More options for ${file.name}`} onClick={() => setMenuTarget(menuTarget?.id === file.id ? null : { type: 'file', id: file.id, name: file.name })}><Icon name="more" size={18} /></button>
                            {menuTarget?.id === file.id && <ItemMenu onRename={() => startRename({ type: 'file', ...file })} onDelete={() => deleteItem({ type: 'file', ...file })} />}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="list-wrap">
                      <div className="list-header"><span>Name</span><span>Owner</span><span>Last modified</span><span>File size</span><span /></div>
                      {filteredFiles.map((file) => (
                        <div className="file-row" key={file.id}>
                          <button className="list-name" onClick={() => downloadFile(file)}><FileBadge kind={fileKind(file)} /><strong>{file.name}</strong></button>
                          <span className="list-owner"><span className="mini-avatar">{fileOwner.charAt(0).toUpperCase()}</span>You</span>
                          <span className="list-modified">{formatDate(file.updated_at)}</span>
                          <span className="list-size">{formatSize(file.size_bytes)}</span>
                          <div className="row-actions">
                            <button className="icon-button" aria-label={`More options for ${file.name}`} onClick={() => setMenuTarget(menuTarget?.id === file.id ? null : { type: 'file', id: file.id, name: file.name })}><Icon name="more" size={18} /></button>
                            {menuTarget?.id === file.id && <ItemMenu onRename={() => startRename({ type: 'file', ...file })} onDelete={() => deleteItem({ type: 'file', ...file })} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="empty-state">
                    <span className="empty-illustration"><Icon name={query ? 'search' : 'folder'} size={30} /></span>
                    <h3>{query ? 'No matching files or folders' : 'Nothing here yet'}</h3>
                    <p>{query ? 'Try another search or check your spelling.' : 'Upload a file or create a folder to get started.'}</p>
                    {!query && <button onClick={() => chooseNew('upload')}>Upload a file</button>}
                    {query && <button onClick={() => setQuery('')}>Clear search</button>}
                  </div>
                )}
              </>
            )}
          </section>

          <div className="prototype-note"><Icon name="cloud" size={16} /><span>Private workspace</span><span className="note-separator">·</span><span>Signed in as {user.email}</span></div>
        </div>
      </main>

      <input ref={fileInput} className="visually-hidden" type="file" multiple onChange={uploadFiles} />

      {showFolderDialog && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFolderDialog(false) }}>
          <form className="folder-dialog" onSubmit={createFolder}>
            <div className="dialog-heading"><div><span className="dialog-icon"><Icon name="folder" size={20} /></span><h2>Create a folder</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => setShowFolderDialog(false)}><Icon name="close" size={20} /></button></div>
            <label htmlFor="folder-name">Folder name</label>
            <input ref={folderInput} id="folder-name" autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Untitled folder" />
            <div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => setShowFolderDialog(false)}>Cancel</button><button type="submit" className="create-button" disabled={busy || !folderName.trim()}>{busy ? 'Creating…' : 'Create'}</button></div>
          </form>
        </div>
      )}

      {editTarget && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditTarget(null) }}>
          <form className="folder-dialog" onSubmit={saveRename}>
            <div className="dialog-heading"><div><span className="dialog-icon"><Icon name="file" size={20} /></span><h2>Rename {editTarget.type}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => setEditTarget(null)}><Icon name="close" size={20} /></button></div>
            <label htmlFor="rename-item">Name</label>
            <input id="rename-item" autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} />
            <div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => setEditTarget(null)}>Cancel</button><button type="submit" className="create-button" disabled={busy || !editName.trim()}>{busy ? 'Saving…' : 'Save'}</button></div>
          </form>
        </div>
      )}

      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
    </div>
  )
}

function ItemMenu({ onRename, onDelete }) {
  return (
    <div className="item-menu">
      <button onClick={onRename}>Rename</button>
      <button className="danger-action" onClick={onDelete}>Delete</button>
    </div>
  )
}

export default App

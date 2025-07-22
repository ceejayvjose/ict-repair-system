import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [formData, setFormData] = useState({
    office: '',
    repairType: 'Desktop',
    equipment: '',
    problem: '',
    requestee: '',
  });
  // Track ticket
  const [ticketNumberInput, setTicketNumberInput] = useState('');
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [newTicketNumber, setNewTicketNumber] = useState('');
  // Login data
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    code: '',
  });
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredVerificationCode, setEnteredVerificationCode] = useState('');
  const [agreedToRedirect, setAgreedToRedirect] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  // NEW: Queue - Now Serving
  const [nowServing, setNowServing] = useState(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Generate 4-digit verification code when entering submit page
  useEffect(() => {
    if (view === 'submit') {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedCode(code);
    }
  }, [view]);

  // Fetch tickets
  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tickets:', error);
      alert('Failed to load tickets: ' + error.message);
      return;
    }
    setTickets(data || []);
  };

  // Fetch admin message
  const fetchAdminMessage = async () => {
    const { data, error } = await supabase
      .from('admin_messages')
      .select('message')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) console.error(error);
    else {
      const msg = data[0]?.message || '';
      setAdminMessage(msg);
      if (msg && view === 'home') {
        setShowAdminPopup(true);
      }
    }
  };

  // Submit ticket
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate entered code
    if (!enteredVerificationCode || enteredVerificationCode !== generatedCode) {
      alert('Please enter the correct 4-digit verification code.');
      return;
    }

    // Generate ticket number: YYYYMMDD + sequential
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const existingTodayTickets = tickets.filter(t => t.ticket_number.startsWith(datePrefix));
    const nextNum = String(existingTodayTickets.length + 1).padStart(5, '0'); // 00001 format
    const fullTicketNumber = datePrefix + nextNum;

    const newTicket = {
      office: formData.office,
      repair_type: formData.repairType,
      equipment: formData.equipment,
      problem: formData.problem,
      requestee: formData.requestee,
      status: 'Evaluation',
      ticket_number: fullTicketNumber,
    };
    const { error } = await supabase.from('tickets').insert([newTicket]);
    if (error) {
      console.error('Supabase Insert Error:', error);
      alert(`Failed to submit ticket: ${error.message}`);
      return;
    }
    fetchTickets(); // Refresh tickets
    setFormData({
      office: '',
      repairType: 'Desktop',
      equipment: '',
      problem: '',
      requestee: '',
    });
    setNewTicketNumber(fullTicketNumber);
    setEnteredVerificationCode('');
    setShowModal(true);
  };

  // Update ticket
  const handleUpdateTicket = async (updatedTicket) => {
    const { error } = await supabase
      .from('tickets')
      .update(updatedTicket)
      .eq('id', updatedTicket.id);
    if (!error) {
      fetchTickets();
    }
  };

  // Delete ticket
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (!error) {
      fetchTickets();
    } else {
      alert('Failed to delete ticket: ' + error.message);
    }
  };

  // Track ticket
  const handleTrackTicket = () => {
    const input = ticketNumberInput.trim();
    if (!input) {
      setTrackingError('Please enter a ticket number.');
      setTrackedTicket(null);
      return;
    }
    const found = tickets.find((t) => t.ticket_number === input);
    if (found) {
      setTrackedTicket(found);
      setTrackingError('');
    } else {
      setTrackedTicket(null);
      setTrackingError('Ticket not found. Please check the ticket number.');
    }
  };

  // Post message
  const handlePostMessage = async () => {
    await supabase.from('admin_messages').delete().neq('id', 0);
    const { error } = await supabase.from('admin_messages').insert([
      { message: adminMessage },
    ]);
    if (!error) {
      alert('Message posted to users!');
      setShowAdminPopup(true);
    }
  };

  // Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const { email, password, code } = loginData;
    if (code !== generatedCode) {
      alert('Invalid code. Please enter the correct 4-digit code.');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }
    setUser(data.user);
    setView('admin');
  };

  // Generate admin login code
  useEffect(() => {
    if (view === 'adminLogin') {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedCode(code);
    }
  }, [view]);

  // Load dark mode and user
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        setView('admin');
      }
      fetchTickets();
      fetchAdminMessage();
    };
    checkUser();
  }, []);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set now serving
  const setAsNowServing = (ticket) => {
    setNowServing(ticket);
  };

  // NEW: Admin popup visibility
  const [showAdminPopup, setShowAdminPopup] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-blue-600'} text-white p-4 shadow-md`}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">ICT Repair Ticket System</h1>
          <div className="flex items-center space-x-4">
            {view !== 'home' && (
              <button
                onClick={() => setView('home')}
                className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition"
              >
                Back
              </button>
            )}
            {user && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  setView('home');
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Logout
              </button>
            )}
            <button
              onClick={toggleDarkMode}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        {/* Admin Message Banner */}
        {adminMessage && (
          <div
            className={`${
              darkMode ? 'bg-yellow-900 border-l-4 border-yellow-600 text-yellow-200' : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700'
            } p-4 mb-4 rounded-md`}
          >
            <p className="font-bold">Notice from Admin</p>
            <p>{adminMessage}</p>
          </div>
        )}

        {/* Home View */}
        {view === 'home' && (
          <>
            {/* Queue: Now Serving */}
            <section
              className={`${
                darkMode ? 'bg-blue-900 text-white' : 'bg-blue-50 text-gray-800'
              } p-6 rounded-lg shadow-md max-w-2xl mx-auto`}
            >
              <h2 className="text-xl font-bold mb-4">🛠️ Technician Queue</h2>
              {nowServing ? (
                <div className="space-y-2">
                  <p><span className="font-medium">Now Serving:</span> #{nowServing.ticket_number}</p>
                  <p><span className="font-medium">Requestee:</span> {nowServing.requestee}</p>
                  <p><span className="font-medium">Issue:</span> {nowServing.problem}</p>
                  {/* ✅ Removed Clear Button */}
                </div>
              ) : (
                <p>No ticket currently being served.</p>
              )}
            </section>

            {/* Main Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setView('submit')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-lg'
                } p-6 rounded-lg shadow-md text-center cursor-pointer transition`}
              >
                <h2 className="text-xl font-bold mb-2">Submit Ticket</h2>
                <p>Request a repair for ICT equipment</p>
              </div>
              <div
                onClick={() => setView('track')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-lg'
                } p-6 rounded-lg shadow-md text-center cursor-pointer transition`}
              >
                <h2 className="text-xl font-bold mb-2">Track Ticket</h2>
                <p>Check the status of your repair request</p>
              </div>
              <div
                onClick={() => setView('adminLogin')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-lg'
                } p-6 rounded-lg shadow-md text-center cursor-pointer transition`}
              >
                <h2 className="text-xl font-bold mb-2">Admin Login</h2>
                <p>Manage tickets and technician assignments</p>
              </div>
            </div>
          </>
        )}

        {/* Submit Ticket */}
        {view === 'submit' && (
          <section
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-6 rounded-lg shadow-md max-w-2xl mx-auto`}
          >
            <h2 className="text-xl font-semibold mb-4">Submit a Repair Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Office Requesting</label>
                <input
                  type="text"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Type of Repair</label>
                <select
                  value={formData.repairType}
                  onChange={(e) => setFormData({ ...formData, repairType: e.target.value })}
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                >
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Printer</option>
                  <option>Internet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Equipment Name</label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Problem Description</label>
                <textarea
                  rows={4}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Name of Requestee</label>
                <input
                  type="text"
                  value={formData.requestee}
                  onChange={(e) => setFormData({ ...formData, requestee: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              {/* ✅ 4-Digit Verification Code Display & Input */}
              <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-2">Verification Step</h3>
                <p className="text-sm mb-2">
                  Enter the 4-digit code shown below to confirm your submission.
                </p>
                <div className="mb-2">
                  <span
                    className={`inline-block px-4 py-2 text-lg font-bold tracking-widest ${
                      darkMode ? 'bg-gray-600 text-blue-400' : 'bg-white text-blue-600'
                    } rounded border`}
                  >
                    {generatedCode}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredVerificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setEnteredVerificationCode(value);
                  }}
                  required
                  placeholder="Enter code above"
                  className={`mt-1 block w-full rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:border-blue-500 focus:ring focus:ring-blue-200 text-center text-lg`}
                />
              </div>
              <button
                type="submit"
                className={`${
                  darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
                } w-full text-white py-2 px-4 rounded-md transition`}
              >
                Submit Ticket
              </button>
            </form>
          </section>
        )}

        {/* Track Ticket */}
        {view === 'track' && (
          <section
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-6 rounded-lg shadow-md max-w-2xl mx-auto`}
          >
            <h2 className="text-xl font-semibold mb-4">Track Your Ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Enter Ticket Number</label>
                <div className="flex mt-1">
                  <span
                    className={`inline-flex items-center px-3 rounded-l-md border ${
                      darkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                  >
                    #
                  </span>
                  <input
                    type="text"
                    value={ticketNumberInput}
                    onChange={(e) => setTicketNumberInput(e.target.value)}
                    placeholder="e.g. 2025072200001"
                    className={`block w-full rounded-r-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    } focus:border-blue-500 focus:ring focus:ring-blue-200`}
                  />
                </div>
              </div>
              <button
                onClick={handleTrackTicket}
                className={`${
                  darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-2 px-4 rounded-md transition`}
              >
                Track Ticket
              </button>
              {trackingError && (
                <p className={`${darkMode ? 'text-red-400' : 'text-red-500'} text-sm`}>{trackingError}</p>
              )}
              {trackedTicket && (
                <div
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  } mt-6 border rounded-md p-4`}
                >
                  <h3 className="font-medium">Ticket #{trackedTicket.ticket_number}</h3>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Requestee:</span> {trackedTicket.requestee}
                  </p>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Office:</span> {trackedTicket.office}
                  </p>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Issue:</span> {trackedTicket.problem}
                  </p>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Status:</span>{' '}
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        trackedTicket.status === 'Repaired'
                          ? 'bg-green-100 text-green-800'
                          : trackedTicket.status === 'Scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : trackedTicket.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {trackedTicket.status}
                    </span>
                  </p>
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Technician:</span> {trackedTicket.technician}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Admin Login */}
        {view === 'adminLogin' && (
          <section
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-6 rounded-lg shadow-md max-w-md mx-auto`}
          >
            <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
            <div className="mb-4 text-center">
              <p className="text-sm">Enter the 4-digit code below to continue:</p>
              <div
                className={`mt-2 text-lg font-bold text-center ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                {generatedCode}
              </div>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Enter 4-digit Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={loginData.code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setLoginData({ ...loginData, code: value });
                  }}
                  required
                  placeholder="1234"
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-center text-lg tracking-widest`}
                />
              </div>
              <button
                type="submit"
                className={`${
                  darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
                } w-full text-white py-2 px-4 rounded-md transition`}
              >
                Login
              </button>
            </form>
          </section>
        )}

        {/* Admin Panel */}
        {view === 'admin' && user && (
          <AdminPanel
            tickets={tickets}
            onUpdateTicket={handleUpdateTicket}
            onPostMessage={handlePostMessage}
            adminMessage={adminMessage}
            setAdminMessage={setAdminMessage}
            getTypeCount={(type) => tickets.filter((t) => t.repair_type === type).length}
            handleDeleteTicket={handleDeleteTicket}
            darkMode={darkMode}
            nowServing={nowServing}
            setAsNowServing={setAsNowServing}
          />
        )}
      </main>

      {/* ✅ POPUP: Admin Message Popup */}
      {showAdminPopup && adminMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-6 rounded-lg shadow-lg max-w-md w-full`}
          >
            <h3 className="text-xl font-bold mb-4 text-yellow-500">Notice from Admin</h3>
            <p className="mb-6">{adminMessage}</p>
            <button
              onClick={() => setShowAdminPopup(false)}
              className={`${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
              } w-full text-white py-2 px-4 rounded-md transition`}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ✅ MODAL: Ticket Submission Success + Redirect Agreement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-6 rounded-lg shadow-lg max-w-sm w-full`}
          >
            <h3 className="text-xl font-bold mb-4">Ticket Submitted Successfully!</h3>
            <p className="mb-4">
              Your ticket number is: <span className="font-bold text-blue-400">{newTicketNumber}</span>
            </p>
            <p className="mb-4">Please keep this number for future reference.</p>
            <div className="flex items-start mb-4">
              <input
                type="checkbox"
                id="agreeRedirect"
                checked={agreedToRedirect}
                onChange={(e) => setAgreedToRedirect(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="agreeRedirect" className="ml-2 text-sm">
                I agree to upload my report file in the next website{' '}
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeS_9axdB3it0MbZ1LrZnKfdVrro7p2x9ZqBslcj6W_h2UAMw/viewform "
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  (click to preview)
                </a>
              </label>
            </div>
            <button
              onClick={() => {
                if (!agreedToRedirect) {
                  alert('You must agree to proceed.');
                  return;
                }
                setShowModal(false);
                setView('home');
                window.location.href =
                  'https://docs.google.com/forms/d/e/1FAIpQLSeS_9axdB3it0MbZ1LrZnKfdVrro7p2x9ZqBslcj6W_h2UAMw/viewform?usp=sharing&ouid=109247182578013546765';
              }}
              disabled={!agreedToRedirect}
              className={`${
                agreedToRedirect
                  ? darkMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              } w-full text-white py-2 px-4 rounded-md transition`}
            >
              Continue to Report Upload
            </button>
          </div>
        </div>
      )}

      {/* ✅ Clock */}
      <div
        className={`text-center py-4 ${
          darkMode ? 'text-blue-400' : 'text-blue-600'
        } border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <p className="text-lg font-mono">
          🕒 {currentTime.toLocaleTimeString()}
        </p>
      </div>

      {/* Footer */}
      <footer
        className={`${
          darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
        } py-6`}
      >
        <div className="container mx-auto text-center space-y-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} ICT Repair Ticket System
          </p>
          <a
            href=" https://www.mediafire.com/file/g0e2ww83ty05nhc/ICT_Repair_Ticket_System_1_1.0.apk/file "
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition ${
              darkMode ? 'shadow-lg shadow-green-900/30' : ''
            }`}
          >
            📲 Download Mobile App
          </a>
        </div>
      </footer>
    </div>
  );
}

// AdminPanel Component
function AdminPanel({
  tickets,
  onUpdateTicket,
  onPostMessage,
  adminMessage,
  setAdminMessage,
  getTypeCount,
  handleDeleteTicket,
  darkMode,
  nowServing,
  setAsNowServing,
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Admin Dashboard
        </h2>
        <div
          className={`${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          } p-6 rounded-lg shadow-md`}
        >
          <h3 className="font-medium text-lg mb-2">Post a Message to Users</h3>
          <textarea
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            rows={3}
            placeholder="Write a message for users..."
            className={`w-full border rounded p-2 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          />
          <button
            onClick={onPostMessage}
            className={`mt-2 ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded-md hover:bg-blue-700 transition`}
          >
            Post Message
          </button>
        </div>
      </section>
      <section>
        <h3 className={`font-medium text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Repair Statistics
        </h3>
        <div
          className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } p-6 rounded-lg shadow-md grid grid-cols-2 md:grid-cols-4 gap-4`}
        >
          {['Desktop', 'Laptop', 'Printer', 'Internet'].map((type) => (
            <div key={type} className="text-center">
              <div
                className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {getTypeCount(type)}
              </div>
              <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                {type}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className={`font-medium text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Ticket Management
        </h3>
        <div
          className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } overflow-x-auto rounded-lg shadow-md border`}
        >
          <table className="min-w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                <th className="py-2 px-4 border-b">Ticket #</th>
                <th className="py-2 px-4 border-b">Requestee</th>
                <th className="py-2 px-4 border-b">Office</th>
                <th className="py-2 px-4 border-b">Type</th>
                <th className="py-2 px-4 border-b">Problem</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Technician</th>
                <th className="py-2 px-4 border-b">Scheduled Date</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  } transition`}
                >
                  <td className="py-2 px-4 border-b text-center">#{ticket.ticket_number}</td>
                  <td className="py-2 px-4 border-b">{ticket.requestee}</td>
                  <td className="py-2 px-4 border-b">{ticket.office}</td>
                  <td className="py-2 px-4 border-b">{ticket.repair_type}</td>
                  <td className="py-2 px-4 border-b text-sm">{ticket.problem}</td>
                  <td className="py-2 px-4 border-b">
                    <select
                      value={ticket.status}
                      onChange={(e) =>
                        onUpdateTicket({
                          ...ticket,
                          status: e.target.value,
                        })
                      }
                      className={`border rounded px-2 py-1 text-sm w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option>Evaluation</option>
                      <option>Pending</option>
                      <option>Scheduled</option>
                      <option>Repaired</option>
                    </select>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <input
                      type="text"
                      defaultValue={ticket.technician}
                      onBlur={(e) =>
                        onUpdateTicket({
                          ...ticket,
                          technician: e.target.value,
                        })
                      }
                      className={`border rounded px-2 py-1 text-sm w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <input
                      type="date"
                      defaultValue={ticket.scheduled_date}
                      onBlur={(e) =>
                        onUpdateTicket({
                          ...ticket,
                          scheduled_date: e.target.value,
                        })
                      }
                      className={`border rounded px-2 py-1 text-sm w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setAsNowServing(ticket)}
                        className="text-blue-500 hover:text-blue-400 text-xs"
                      >
                        Now Serving
                      </button>
                      <button
                        onClick={() => onUpdateTicket({ ...ticket, status: 'Repaired' })}
                        className="text-green-500 hover:text-green-400 text-xs"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="text-red-500 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

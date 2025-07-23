import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Tutorial steps
const tutorialSteps = [
  {
    title: "Welcome to ICT Repair System",
    content: "This tutorial will guide you through submitting a repair ticket and checking its status.",
    icon: "👋"
  },
  {
    title: "Step 1: Submit a Ticket",
    content: "Click 'Submit Ticket' to report an issue with your computer, laptop, printer, or internet connection. Fill out the form with your office, equipment details, and problem description.",
    icon: "🛠️"
  },
  {
    title: "Step 2: Verification Code",
    content: "Enter the 4-digit verification code shown on screen to confirm your submission. This helps prevent spam submissions.",
    icon: "🔐"
  },
  {
    title: "Step 3: Save Your Ticket Number",
    content: "After submission, you'll receive a unique ticket number. Keep this number safe as you'll need it to track your repair status.",
    icon: "📌"
  },
  {
    title: "Step 4: Track Your Ticket",
    content: "Click 'Track Ticket' and enter your ticket number to check the current status of your repair request. You'll see updates from our technicians.",
    icon: "🔍"
  },
  {
    title: "Step 5: Status Updates",
    content: "Your ticket status will change from 'Evaluation' to 'Scheduled' and finally 'Repaired' as we work on your request. You can also see which technician is assigned to your repair.",
    icon: "🔄"
  }
];

// Move AdminPanel before usage
function AdminPanel({
  tickets,
  onUpdateTicket,
  onPostMessage,
  adminMessage,
  setAdminMessage,
  getTypeCount,
  handleDeleteTicket,
  darkMode,
}) {
  const [selectedTicket, setSelectedTicket] = useState(null);

  const openTicketModal = (ticket) => {
    setSelectedTicket({ ...ticket });
  };

  const closeModal = () => {
    setSelectedTicket(null);
  };

  const saveChanges = async () => {
    await onUpdateTicket(selectedTicket);
    closeModal();
  };

  // Print ticket function
  const printTicket = (ticket) => {
    const printWindow = window.open('', '_blank');
    const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${ticket.ticket_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { width: 80px; height: 80px; object-fit: cover; border-radius: 50%; }
          h1 { margin: 5px 0; color: #0066cc; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .field { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
          .label { font-weight: bold; color: #555; margin-bottom: 5px; }
          .value { color: #333; }
          .status { 
            padding: 10px; 
            border-radius: 5px; 
            font-weight: bold; 
            text-align: center;
            margin: 20px 0;
            background-color: ${
              ticket.status === 'Repaired' ? '#d4edda' :
              ticket.status === 'Scheduled' ? '#d1ecf1' :
              ticket.status === 'Pending' ? '#fff3cd' : '#f8f9fa'
            };
            color: ${
              ticket.status === 'Repaired' ? '#155724' :
              ticket.status === 'Scheduled' ? '#0c5460' :
              ticket.status === 'Pending' ? '#856404' : '#383d41'
            };
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzP364l67W5zbf2Sm_NbQ4ojteKyj3nIIvMg&s" alt="ICT Logo" class="logo">
          <h1>ICT Repair Ticket System</h1>
          <p>Repair Ticket Details</p>
        </div>
        
        <div class="info-grid">
          <div class="field">
            <div class="label">Ticket Number</div>
            <div class="value">#${ticket.ticket_number}</div>
          </div>
          <div class="field">
            <div class="label">Date Submitted</div>
            <div class="value">${new Date(ticket.created_at).toLocaleDateString()}</div>
          </div>
          <div class="field">
            <div class="label">Requestee</div>
            <div class="value">${ticket.requestee}</div>
          </div>
          <div class="field">
            <div class="label">Office</div>
            <div class="value">${ticket.office}</div>
          </div>
          <div class="field">
            <div class="label">Repair Type</div>
            <div class="value">${ticket.repair_type}</div>
          </div>
          <div class="field">
            <div class="label">Status</div>
            <div class="value">${ticket.status}</div>
          </div>
          <div class="field">
            <div class="label">Technician</div>
            <div class="value">${ticket.technician || 'Not assigned'}</div>
          </div>
          <div class="field">
            <div class="label">Scheduled Date</div>
            <div class="value">${ticket.scheduled_date ? new Date(ticket.scheduled_date).toLocaleDateString() : 'Not scheduled'}</div>
          </div>
        </div>
        
        <div class="field">
          <div class="label">Problem Description</div>
          <div class="value">${ticket.problem}</div>
        </div>
        
        <div class="status">
          Current Status: ${ticket.status}
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="space-y-8">
        {/* Post Message */}
        <section>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Admin Dashboard
          </h2>
          <div
            className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-6 rounded-lg shadow-md`}
          >
            <h3 className="font-medium text-lg mb-2">📢 Broadcast Message</h3>
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              rows={3}
              placeholder="Send an important notice to all users..."
              className={`w-full border rounded p-2 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <button
              onClick={onPostMessage}
              className={`mt-2 ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-md transition`}
            >
              Send Message
            </button>
          </div>
        </section>

        {/* Statistics */}
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

        {/* Ticket Management Table */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-medium text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Ticket Management
            </h3>
            <button
              onClick={() => printTicket({ tickets, title: "All Tickets Report" })}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 no-print"
            >
              🖨️ Print All
            </button>
          </div>
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
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } transition cursor-pointer`}
                    onClick={() => openTicketModal(ticket)}
                  >
                    <td className="py-2 px-4 border-b text-center text-blue-500 underline font-mono">
                      #{ticket.ticket_number}
                    </td>
                    <td className="py-2 px-4 border-b">{ticket.requestee}</td>
                    <td className="py-2 px-4 border-b">{ticket.office}</td>
                    <td className="py-2 px-4 border-b">{ticket.repair_type}</td>
                    <td className="py-2 px-4 border-b text-sm truncate max-w-xs" title={ticket.problem}>
                      {ticket.problem}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          ticket.status === 'Repaired'
                            ? 'bg-green-100 text-green-800'
                            : ticket.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : ticket.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketModal(ticket);
                          }}
                          className="text-blue-500 hover:text-blue-400 text-xs"
                        >
                          Open
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printTicket(ticket);
                          }}
                          className="text-green-500 hover:text-green-400 text-xs no-print"
                        >
                          🖨️ Print
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

      {/* ✅ TICKET DETAIL MODAL - SCROLLABLE */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            tabIndex="0"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-blue-500">#{selectedTicket.ticket_number}</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full transition hover:bg-gray-700"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <div>
                <label className="block text-sm font-medium mb-1">Requestee</label>
                <input
                  type="text"
                  value={selectedTicket.requestee}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, requestee: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Office</label>
                <input
                  type="text"
                  value={selectedTicket.office}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, office: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Repair Type</label>
                <select
                  value={selectedTicket.repair_type}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, repair_type: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Printer</option>
                  <option>Internet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Problem Description</label>
                <textarea
                  rows={4}
                  value={selectedTicket.problem}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, problem: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, status: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option>Evaluation</option>
                  <option>Pending</option>
                  <option>Scheduled</option>
                  <option>Repaired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Technician Assigned</label>
                <input
                  type="text"
                  value={selectedTicket.technician || ''}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, technician: e.target.value })
                  }
                  placeholder="Enter technician name"
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={selectedTicket.scheduled_date || ''}
                  onChange={(e) =>
                    setSelectedTicket({ ...selectedTicket, scheduled_date: e.target.value })
                  }
                  className={`w-full border rounded p-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-700">
              <button
                onClick={saveChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
              >
                💾 Save Changes
              </button>
              <button
                onClick={() => {
                  onUpdateTicket({ ...selectedTicket, status: 'Repaired' });
                  closeModal();
                }}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition"
              >
                ✅ Mark as Repaired
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this ticket?')) {
                    handleDeleteTicket(selectedTicket.id);
                    closeModal();
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition"
              >
                ❌ Delete Ticket
              </button>
              <button
                onClick={closeModal}
                className={`py-2 px-4 rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

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
    else setAdminMessage(data[0]?.message || '');
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

    // Listen for REALTIME changes
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => fetchTickets()
      )
      .subscribe();

    const messageChannel = supabase
      .channel('public:admin_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        () => fetchAdminMessage()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messageChannel);
    };
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

  // Tutorial functions
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(0);
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white p-4 shadow-lg`}>
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzP364l67W5zbf2Sm_NbQ4ojteKyj3nIIvMg&s"
              alt="ICT Logo"
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <h1 className="text-2xl font-bold">ICT Repair System</h1>
          </div>
          <div className="flex items-center space-x-4">
            {view !== 'home' && (
              <button
                onClick={() => setView('home')}
                className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition flex items-center gap-2"
              >
                ← Back
              </button>
            )}
            {user && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  setView('home');
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                🔐 Logout
              </button>
            )}
            <button
              onClick={() => setShowTutorial(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              📚 Tutorial
            </button>
            <button
              onClick={toggleDarkMode}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300'
                  : 'bg-white/30 backdrop-blur-sm hover:bg-white/50 text-white'
              }`}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-10">
        {/* Admin Message Banner */}
        {adminMessage && (
          <div
            className={`${
              darkMode
                ? 'bg-yellow-900/30 border-l-4 border-yellow-600 text-yellow-200'
                : 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800'
            } p-5 rounded-r-lg shadow-md`}
          >
            <p className="font-bold text-lg mb-1">📢 Notice from Admin</p>
            <p>{adminMessage}</p>
          </div>
        )}

        {/* Tutorial Modal */}
        {showTutorial && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div
              className={`${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              } p-6 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col transition-colors duration-300`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-5 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{tutorialSteps[tutorialStep].icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{tutorialSteps[tutorialStep].title}</h3>
                    <div className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                      Step {tutorialStep + 1} of {tutorialSteps.length}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTutorial(false);
                    setTutorialStep(0);
                  }}
                  className={`text-gray-400 hover:text-gray-200 text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full transition ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  aria-label="Close tutorial"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-6">
                <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                  {tutorialSteps[tutorialStep].content}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Step {tutorialStep + 1} of {tutorialSteps.length}
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={prevTutorialStep}
                    disabled={tutorialStep === 0}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg font-medium transition ${
                      tutorialStep === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={nextTutorialStep}
                    className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg font-medium text-white transition ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Home View */}
        {view === 'home' && (
          <>
            {/* Hero Section */}
            <section className="text-center py-10">
              <h1 className={`text-4xl font-extrabold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Welcome to ICT Support
              </h1>
              <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                Submit repairs, track progress, and stay updated with real-time notifications.
              </p>
            </section>

            {/* Main Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div
                onClick={() => setView('submit')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-2xl'
                } p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="text-6xl mb-4">🛠️</div>
                <h2 className="text-2xl font-bold mb-2">Submit Ticket</h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Report an issue with desktop, laptop, printer, or internet.
                </p>
              </div>
              <div
                onClick={() => setView('track')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-2xl'
                } p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold mb-2">Track Ticket</h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Check the current status of your submitted repair request.
                </p>
              </div>
              <div
                onClick={() => setView('adminLogin')}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-2xl'
                } p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold mb-2">Admin Login</h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Manage tickets, assign technicians, and send messages.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Submit Ticket */}
        {view === 'submit' && (
          <section
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-8 rounded-2xl shadow-xl max-w-2xl mx-auto`}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">📬 Submit a Repair Request</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Office Requesting</label>
                <input
                  type="text"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type of Repair</label>
                <select
                  value={formData.repairType}
                  onChange={(e) => setFormData({ ...formData, repairType: e.target.value })}
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Printer</option>
                  <option>Internet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Equipment Name</label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Problem Description</label>
                <textarea
                  rows={4}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name of Requestee</label>
                <input
                  type="text"
                  value={formData.requestee}
                  onChange={(e) => setFormData({ ...formData, requestee: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              {/* Verification Code */}
              <div className={`p-5 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  🔐 Enter Verification Code
                </h3>
                <p className="text-sm mb-3 text-gray-500">
                  Confirm submission by entering the code below.
                </p>
                <div className="mb-3 text-2xl font-bold tracking-widest bg-white text-blue-600 rounded-lg px-4 py-2 inline-block">
                  {generatedCode}
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
                  className={`w-full border rounded-lg p-3 text-center text-lg ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`w-full ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-3 px-6 rounded-lg text-lg font-medium hover:shadow-lg transition`}
              >
                🚀 Submit Ticket
              </button>
            </form>
          </section>
        )}

        {/* Track Ticket */}
        {view === 'track' && (
          <section
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-8 rounded-2xl shadow-xl max-w-2xl mx-auto`}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">🔍 Track Your Ticket</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Enter Ticket Number</label>
                <div className="flex mt-1">
                  <span
                    className={`inline-flex items-center px-4 rounded-l-lg border-t border-b border-l ${
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
                    className={`block w-full rounded-r-lg border-t border-b border-r ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              <button
                onClick={handleTrackTicket}
                className={`${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-3 px-6 rounded-lg w-full transition`}
              >
                🔍 Find Ticket
              </button>
              {trackingError && (
                <p className="text-red-500 text-center">{trackingError}</p>
              )}
              {trackedTicket && (
                <div
                  className={`${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
                  } mt-6 border rounded-xl p-6`}
                >
                  <h3 className="text-xl font-bold text-blue-600">#{trackedTicket.ticket_number}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <p><span className="font-medium">Requestee:</span> {trackedTicket.requestee}</p>
                    <p><span className="font-medium">Office:</span> {trackedTicket.office}</p>
                    <p><span className="font-medium">Issue:</span> {trackedTicket.problem}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        trackedTicket.status === 'Repaired' ? 'bg-green-100 text-green-800' :
                        trackedTicket.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{trackedTicket.status}</span>
                    </p>
                    <p><span className="font-medium">👨‍🔧 Technician:</span> {trackedTicket.technician || 'Not assigned yet'}</p>
                    <p><span className="font-medium">📅 Scheduled Date:</span> 
                      {trackedTicket.scheduled_date
                        ? new Date(trackedTicket.scheduled_date).toLocaleDateString()
                        : 'Not scheduled yet'}
                    </p>
                  </div>
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
            } p-8 rounded-2xl shadow-xl max-w-md mx-auto`}
          >
            <h2 className="text-2xl font-bold mb-6 text-center">🔐 Admin Login</h2>
            <div className="mb-5 text-center">
              <p className="text-sm text-gray-500">Enter the 4-digit code below:</p>
              <div className="text-3xl font-bold text-blue-500 mt-2">{generatedCode}</div>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enter 4-digit Code</label>
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
                  className={`w-full border rounded-lg p-3 text-center text-lg ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition`}
              >
                🔓 Log In
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
          />
        )}
      </main>

      {/* ✅ MODAL: Ticket Submission Success */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } p-8 rounded-2xl shadow-2xl max-w-sm w-full transform transition-all animate-fade-in`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-3">Success!</h3>
              <p className="mb-2">
                Your ticket number is:
              </p>
              <p className="font-mono text-lg text-blue-500 font-bold">{newTicketNumber}</p>
              <p className="text-sm text-gray-500 mt-4">
                Keep this number for future reference.
              </p>
            </div>
            <div className="flex items-start mt-6 mb-4">
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
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeS_9axdB3it0MbZ1LrZnKfdVrro7p2x9ZqBslcj6W_h2UAMw/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  (preview)
                </a>
              </label>
            </div>
            <button
              onClick={() => {
                if (!agreedToRedirect) {
                  alert('Please agree to proceed.');
                  return;
                }
                setShowModal(false);
                setView('home');
                window.location.href =
                  'https://docs.google.com/forms/d/e/1FAIpQLSeS_9axdB3it0MbZ1LrZnKfdVrro7p2x9ZqBslcj6W_h2UAMw/viewform';
              }}
              disabled={!agreedToRedirect}
              className={`w-full py-3 px-6 rounded-lg font-medium transition ${
                agreedToRedirect
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue →
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
          <div className="space-y-2">
            <a
              href="https://www.mediafire.com/file/g0e2ww83ty05nhc/ICT_Repair_Ticket_System_1_1.0.apk/file"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-lg hover:shadow-green-900/30`}
            >
              📱 Mobile App
            </a>
            <a
              href="https://www.mediafire.com/file/6u7gu4k8s248nmu/ICT_Repair_Ticket_System.zip/file"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-lg hover:shadow-blue-900/30 ml-4`}
            >
              💻 Desktop App
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

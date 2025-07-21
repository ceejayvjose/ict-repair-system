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
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

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

    const newTicket = {
      office: formData.office,
      repair_type: formData.repairType,
      equipment: formData.equipment,
      problem: formData.problem,
      requestee: formData.requestee,
      status: 'Evaluation',
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert([newTicket])
      .select('id');

    if (error) {
      console.error('Supabase Insert Error:', error);
      alert(`Failed to submit ticket: ${error.message}`);
      return;
    }

    // Get the newly created ticket by ID to get ticket_number
    const { data: ticketData, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', data[0].id)
      .single();

    if (fetchError) {
      console.error('Fetch after insert failed:', fetchError);
      alert('Ticket submitted, but failed to retrieve ticket number');
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

    setNewTicketNumber(ticketData.ticket_number);
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

  // Admin Login (any user is admin)
  const handleAdminLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });

    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }

    setUser(data.user);
    setView('admin');
  };

  // Post admin message
  const handlePostMessage = async () => {
    const { error } = await supabase.from('admin_messages').insert([
      {
        message: adminMessage,
      },
    ]);

    if (!error) {
      alert('Message posted to users!');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('home');
  };

  // Auto-check if user is already logged in
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

  // Reset tracking when leaving page
  useEffect(() => {
    if (view !== 'track') {
      setTicketNumberInput('');
      setTrackedTicket(null);
      setTrackingError('');
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">ICT Repair Ticket System</h1>
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
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        {adminMessage && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">Notice from Admin</p>
            <p>{adminMessage}</p>
          </div>
        )}

        {/* Home View */}
        {view === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => setView('submit')}
              className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold mb-2">Submit Ticket</h2>
              <p>Request a repair for ICT equipment</p>
            </div>

            <div
              onClick={() => setView('track')}
              className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold mb-2">Track Ticket</h2>
              <p>Check the status of your repair request</p>
            </div>

            <div
              onClick={() => setView('adminLogin')}
              className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold mb-2">Admin Login</h2>
              <p>Manage tickets and technician assignments</p>
            </div>
          </div>
        )}

        {/* Submit Ticket */}
        {view === 'submit' && (
          <section className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Submit a Repair Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Office Requesting</label>
                <input
                  type="text"
                  value={formData.office}
                  onChange={(e) =>
                    setFormData({ ...formData, office: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type of Repair</label>
                <select
                  value={formData.repairType}
                  onChange={(e) =>
                    setFormData({ ...formData, repairType: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                >
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Printer</option>
                  <option>Internet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Problem Description</label>
                <textarea
                  rows={4}
                  value={formData.problem}
                  onChange={(e) =>
                    setFormData({ ...formData, problem: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name of Requestee</label>
                <input
                  type="text"
                  value={formData.requestee}
                  onChange={(e) =>
                    setFormData({ ...formData, requestee: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
              >
                Submit Ticket
              </button>
            </form>
          </section>
        )}

        {/* Track Ticket */}
        {view === 'track' && (
          <section className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Track Your Ticket</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Enter Ticket Number</label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">#</span>
                  <input
                    type="text"
                    value={ticketNumberInput}
                    onChange={(e) => setTicketNumberInput(e.target.value)}
                    placeholder="e.g. 00001"
                    className="block w-full rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                  />
                </div>
              </div>

              <button
                onClick={handleTrackTicket}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
              >
                Track Ticket
              </button>

              {trackingError && (
                <p className="text-red-500 text-sm">{trackingError}</p>
              )}

              {trackedTicket && (
                <div className="mt-6 border rounded-md p-4 bg-gray-50">
                  <h3 className="font-medium">Ticket #{trackedTicket.ticket_number}</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Requestee:</span> {trackedTicket.requestee}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Office:</span> {trackedTicket.office}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Issue:</span> {trackedTicket.problem}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
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
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Technician:</span> {trackedTicket.technician}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Admin Login */}
        {view === 'adminLogin' && (
          <section className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
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
            getTypeCount={(type) =>
              tickets.filter((t) => t.repair_type === type).length
            }
          />
        )}
      </main>

      {/* Ticket Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4">Ticket Submitted Successfully!</h3>
            <p className="mb-4">
              Your ticket number is: <span className="font-bold text-blue-600">{newTicketNumber}</span>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Please keep this number for future reference.
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                setView('home');
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="bg-gray-100 py-4 mt-10">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} ICT Repair Ticket System
        </div>
      </footer>
    </div>
  );
}

// Admin Panel Component
function AdminPanel({
  tickets,
  onUpdateTicket,
  onPostMessage,
  adminMessage,
  setAdminMessage,
  getTypeCount,
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-medium text-lg mb-2">Post a Message to Users</h3>
          <textarea
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            rows={3}
            placeholder="Write a message for users..."
            className="w-full border rounded p-2"
          />
          <button
            onClick={onPostMessage}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Post Message
          </button>
        </div>
      </section>

      <section>
        <h3 className="font-medium text-lg mb-2">Repair Statistics</h3>
        <div className="bg-white p-6 rounded-lg shadow-md grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Desktop', 'Laptop', 'Printer', 'Internet'].map((type) => (
            <div key={type} className="text-center">
              <div className="text-3xl font-bold">{getTypeCount(type)}</div>
              <div className="text-sm text-gray-600">{type}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-medium text-lg mb-2">Ticket Management</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b">Ticket #</th>
                <th className="py-2 px-4 border-b">Requestee</th>
                <th className="py-2 px-4 border-b">Office</th>
                <th className="py-2 px-4 border-b">Type</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Technician</th>
                <th className="py-2 px-4 border-b">Scheduled Date</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-center">#{ticket.ticket_number}</td>
                  <td className="py-2 px-4 border-b">{ticket.requestee}</td>
                  <td className="py-2 px-4 border-b">{ticket.office}</td>
                  <td className="py-2 px-4 border-b">{ticket.repair_type}</td>
                  <td className="py-2 px-4 border-b">
                    <select
                      value={ticket.status}
                      onChange={(e) =>
                        onUpdateTicket({
                          ...ticket,
                          status: e.target.value,
                        })
                      }
                      className="border rounded px-2 py-1 text-sm"
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
                      className="border rounded px-2 py-1 text-sm w-full"
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
                      className="border rounded px-2 py-1 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    <button
                      onClick={() =>
                        onUpdateTicket({ ...ticket, status: 'Repaired' })
                      }
                      className="text-green-600 hover:text-green-800"
                    >
                      Complete
                    </button>
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
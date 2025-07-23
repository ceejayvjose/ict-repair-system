import { useEffect, useState, useRef } from 'react';
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
    content: "Your ticket status will change from 'Evaluation' to 'Scheduled' and finally 'Repaired' as we work on your request.",
    icon: "🔄"
  }
];

// Toast component for non-intrusive notifications
function Toast({ message, type, onClose }) {
  const types = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${types[type]} transition-all duration-300 transform translate-x-0 opacity-100`}>
      <span className="mr-2">
        {type === 'success' && '✅'}
        {type === 'error' && '❌'}
        {type === 'info' && 'ℹ️'}
        {type === 'warning' && '⚠️'}
      </span>
      {message}
      <button 
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Status Badge component with icons
function StatusBadge({ status }) {
  const statusConfig = {
    'Evaluation': { color: 'bg-gray-100 text-gray-800', icon: '🔍' },
    'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    'Scheduled': { color: 'bg-blue-100 text-blue-800', icon: '📅' },
    'Repaired': { color: 'bg-green-100 text-green-800', icon: '✅' }
  };

  const config = statusConfig[status] || statusConfig['Evaluation'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {status}
    </span>
  );
}

// Priority Indicator component
function PriorityIndicator({ priority }) {
  if (priority !== 'RUSH') return null;
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-red-500 animate-pulse">
      ⚡ RUSH
    </span>
  );
}

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
  const [selectedChatTicket, setSelectedChatTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const chatChannelRef = useRef(null);

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

  // Open chat for ticket
  const openChat = async (ticket) => {
    setSelectedChatTicket(ticket);
    setShowChat(true);
    setNewMessage('');
    
    // Fetch chat messages
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('ticket_number', ticket.ticket_number)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching chat messages:', error);
    } else {
      setChatMessages(data);
    }

    // Remove previous channel if exists
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }

    // Listen for new messages
    chatChannelRef.current = supabase
      .channel(`chat-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_number=eq.${ticket.ticket_number}`
        },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
      }
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChatTicket) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          ticket_number: selectedChatTicket.ticket_number,
          sender_type: 'admin',
          message: newMessage
        }
      ]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  const closeChat = () => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }
    setShowChat(false);
    setSelectedChatTicket(null);
    setChatMessages([]);
    setNewMessage('');
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    const matchesSearch = ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.requestee.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.office.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Sort tickets by status priority
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const statusOrder = { 'Evaluation': 0, 'Pending': 1, 'Scheduled': 2, 'Repaired': 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Export to Excel
  const exportToExcel = () => {
    // Create CSV content (Excel can read CSV)
    const headers = ['Ticket #', 'Requestee', 'Office', 'Type', 'Problem', 'Status', 'Technician', 'Scheduled Date', 'Submitted'];
    const csvContent = [
      headers.join(','),
      ...sortedTickets.map(ticket => [
        ticket.ticket_number,
        ticket.requestee,
        ticket.office,
        ticket.repair_type,
        `"${ticket.problem.replace(/"/g, '""')}"`,
        ticket.status,
        ticket.technician || '',
        ticket.scheduled_date || '',
        new Date(ticket.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tickets-export-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-6 rounded-2xl shadow-xl`}
          >
            <h3 className="font-medium text-lg mb-2">📢 Broadcast Message</h3>
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              rows={3}
              placeholder="Send an important notice to all users..."
              className={`w-full border rounded-lg p-3 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <button
              onClick={onPostMessage}
              className={`mt-3 ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-6 py-2 rounded-lg transition`}
            >
              Send Message
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section>
          <h3 className={`font-medium text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Repair Statistics
          </h3>
          <div
            className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } p-6 rounded-2xl shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4`}
          >
            {['Desktop', 'Laptop', 'Printer', 'Internet'].map((type) => (
              <div key={type} className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                <div
                  className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  {getTypeCount(type)}
                </div>
                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium mt-2`}>
                  {type}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ticket Management Header */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className={`font-bold text-2xl ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🎫 Ticket Management
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 w-full sm:w-64`}
                />
                <svg 
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="All">All Status</option>
                <option value="Evaluation">Evaluation</option>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Repaired">Repaired</option>
              </select>
            </div>
          </div>

          {/* Print All Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                const printContent = `
                  <html>
                  <head>
                    <title>All Tickets Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                      .logo { width: 80px; height: 80px; object-fit: cover; border-radius: 50%; }
                      h1 { margin: 5px 0; color: #0066cc; }
                      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f2f2f2; }
                      .status-repaired { background-color: #d4edda; color: #155724; }
                      .status-scheduled { background-color: #d1ecf1; color: #0c5460; }
                      .status-pending { background-color: #fff3cd; color: #856404; }
                      .status-evaluation { background-color: #f8f9fa; color: #383d41; }
                      @media print {
                        .no-print { display: none !important; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzP364l67W5zbf2Sm_NbQ4ojteKyj3nIIvMg&s" alt="ICT Logo" class="logo">
                      <h1>ICT Repair Ticket System</h1>
                      <p>All Tickets Report - ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Ticket #</th>
                          <th>Requestee</th>
                          <th>Office</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Technician</th>
                          <th>Scheduled Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tickets.map(t => `
                          <tr>
                            <td>#${t.ticket_number}</td>
                            <td>${t.requestee}</td>
                            <td>${t.office}</td>
                            <td>${t.repair_type}</td>
                            <td class="status-${t.status.toLowerCase()}">${t.status}</td>
                            <td>${t.technician || 'Not assigned'}</td>
                            <td>${t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : 'Not scheduled'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </body>
                  </html>
                `;
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.print();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 no-print"
            >
              🖨️ Print All
            </button>
            <button
              onClick={exportToExcel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 no-print ml-2"
            >
              📥 Export Excel
            </button>
          </div>

          {/* Ticket Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedTickets.length === 0 ? (
              <div className={`col-span-full text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-medium mb-2">No tickets found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              sortedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer transform hover:-translate-y-1`}
                  onClick={() => openTicketModal(ticket)}
                  role="button"
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      openTicketModal(ticket);
                    }
                  }}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 ${
                    ticket.status === 'Repaired' ? 'bg-green-600' :
                    ticket.status === 'Scheduled' ? 'bg-blue-600' :
                    ticket.status === 'Pending' ? 'bg-yellow-600' : 'bg-gray-600'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-bold text-lg">#{ticket.ticket_number}</h4>
                        <p className="text-white/80 text-sm">{ticket.repair_type}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={ticket.status} />
                        <PriorityIndicator priority={ticket.priority} />
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{ticket.requestee}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{ticket.office}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ticket.problem}</p>
                    </div>

                    {ticket.technician && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">👨‍🔧</span>
                        <span>{ticket.technician}</span>
                      </div>
                    )}

                    {ticket.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(ticket.scheduled_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className={`px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(ticket);
                        }}
                        className="text-green-500 hover:text-green-600 flex items-center gap-1"
                        aria-label="Open chat"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                        }}
                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 no-print"
                        aria-label="Print ticket"
                      >
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats Footer */}
          <div className={`mt-6 p-4 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex justify-between items-center text-sm">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Showing {sortedTickets.length} of {tickets.length} tickets
              </span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Evaluation: {tickets.filter(t => t.status === 'Evaluation').length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Pending: {tickets.filter(t => t.status === 'Pending').length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Scheduled: {tickets.filter(t => t.status === 'Scheduled').length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Repaired: {tickets.filter(t => t.status === 'Repaired').length}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ✅ PROFESSIONAL TICKET DETAIL MODAL */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-modal-title"
        >
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            tabIndex="0"
            role="document"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 id="ticket-modal-title" className="text-3xl font-bold text-white mb-1">#{selectedTicket.ticket_number}</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityIndicator priority={selectedTicket.priority} />
                    <span className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      {selectedTicket.repair_type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full transition hover:bg-white/20"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Request Info */}
                <div className="space-y-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      📋 Request Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Requestee</div>
                          <div className="font-medium">{selectedTicket.requestee}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Office</div>
                          <div className="font-medium">{selectedTicket.office}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Equipment</div>
                          <div className="font-medium">{selectedTicket.equipment || 'Not specified'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      📅 Date & Time
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Submitted</div>
                          <div className="font-medium">{new Date(selectedTicket.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Problem & Status */}
                <div className="space-y-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      🛠️ Problem Description
                    </h4>
                    <div className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    } min-h-24`}>
                      <p className="text-sm leading-relaxed">{selectedTicket.problem}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      🔄 Status & Assignment
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) =>
                            setSelectedTicket({ ...selectedTicket, status: e.target.value })
                          }
                          className={`w-full border rounded-lg p-3 ${
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
                        <label className="block text-sm font-medium mb-2">Technician Assigned</label>
                        <input
                          type="text"
                          value={selectedTicket.technician || ''}
                          onChange={(e) =>
                            setSelectedTicket({ ...selectedTicket, technician: e.target.value })
                          }
                          placeholder="Enter technician name"
                          className={`w-full border rounded-lg p-3 ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Scheduled Date</label>
                        <input
                          type="date"
                          value={selectedTicket.scheduled_date || ''}
                          onChange={(e) =>
                            setSelectedTicket({ ...selectedTicket, scheduled_date: e.target.value })
                          }
                          className={`w-full border rounded-lg p-3 ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Priority Level</label>
                        <select
                          value={selectedTicket.priority || 'NORMAL'}
                          onChange={(e) =>
                            setSelectedTicket({ ...selectedTicket, priority: e.target.value })
                          }
                          className={`w-full border rounded-lg p-3 ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="NORMAL">NORMAL</option>
                          <option value="RUSH">RUSH</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-700 space-x-3">
              <button
                onClick={saveChanges}
                title="Save Changes"
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  onUpdateTicket({ ...selectedTicket, status: 'Repaired' });
                  closeModal();
                }}
                title="Mark as Repaired"
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this ticket?')) {
                    handleDeleteTicket(selectedTicket.id);
                    closeModal();
                  }
                }}
                title="Delete Ticket"
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              <button
                onClick={closeModal}
                title="Cancel"
                className={`p-3 rounded-lg transition flex items-center justify-center ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CHAT WINDOW FOR ADMIN */}
      {showChat && selectedChatTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } w-full max-w-lg h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-500">
                  Chat with #{selectedChatTicket.ticket_number}
                </h3>
                <p className="text-sm text-gray-400">Admin Conversation</p>
              </div>
              <button
                onClick={closeChat}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full transition hover:bg-gray-700"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50"
              style={{ maxHeight: 'calc(80vh - 160px)' }}
            >
              {chatMessages.length === 0 ? (
                <p className="text-center text-gray-500 mt-4">No messages yet. Start the conversation!</p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_type === 'admin'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className={`flex-1 border rounded-lg px-3 py-2 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Send
                </button>
              </div>
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
    priority: 'NORMAL'
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
  // Toast notifications
  const [toast, setToast] = useState(null);
  // Loading state
  const [loading, setLoading] = useState(false);

  // Chat state
  const [showUserChat, setShowUserChat] = useState(false);
  const [userMessages, setUserMessages] = useState([]);
  const [newUserMessage, setNewUserMessage] = useState('');
  const messagesEndRef = useRef(null);
  const userChatChannelRef = useRef(null);

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
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      console.error('Error fetching tickets:', error);
      setToast({
        message: `Failed to load tickets: ${error.message}`,
        type: 'error'
      });
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
    if (error) {
      console.error('Error fetching admin message:', error);
      setToast({
        message: `Failed to load admin message: ${error.message}`,
        type: 'error'
      });
    } else {
      setAdminMessage(data[0]?.message || '');
    }
  };

  // Submit ticket
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate entered code
    if (!enteredVerificationCode || enteredVerificationCode !== generatedCode) {
      setToast({
        message: 'Please enter the correct 4-digit verification code.',
        type: 'error'
      });
      return;
    }

    // Generate ticket number: YYYYMMDD + sequential
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    // Filter today's tickets and sort by ticket_number to get the highest sequence number
    const todayTickets = tickets
      .filter(t => t.ticket_number.startsWith(datePrefix))
      .sort((a, b) => b.ticket_number.localeCompare(a.ticket_number));
    
    let nextNum = 1;
    if (todayTickets.length > 0) {
      // Extract the sequence number from the highest ticket number
      const lastTicketNumber = todayTickets[0].ticket_number;
      const lastSequence = parseInt(lastTicketNumber.substring(8), 10);
      nextNum = lastSequence + 1;
    }
    
    const fullTicketNumber = datePrefix + String(nextNum).padStart(5, '0');

    const newTicket = {
      office: formData.office,
      repair_type: formData.repairType,
      equipment: formData.equipment,
      problem: formData.problem,
      requestee: formData.requestee,
      status: 'Evaluation',
      ticket_number: fullTicketNumber,
      priority: formData.priority
    };
    
    setLoading(true);
    const { error } = await supabase.from('tickets').insert([newTicket]);
    setLoading(false);
    
    if (error) {
      console.error('Supabase Insert Error:', error);
      setToast({
        message: `Failed to submit ticket: ${error.message}`,
        type: 'error'
      });
      return;
    }
    
    fetchTickets(); // Refresh tickets
    setFormData({
      office: '',
      repairType: 'Desktop',
      equipment: '',
      problem: '',
      requestee: '',
      priority: 'NORMAL'
    });
    setNewTicketNumber(fullTicketNumber);
    setEnteredVerificationCode('');
    setShowModal(true);
    
    setToast({
      message: 'Ticket submitted successfully!',
      type: 'success'
    });
  };

  // Update ticket
  const handleUpdateTicket = async (updatedTicket) => {
    setLoading(true);
    const { error } = await supabase
      .from('tickets')
      .update(updatedTicket)
      .eq('id', updatedTicket.id);
    setLoading(false);
    
    if (!error) {
      fetchTickets();
      setToast({
        message: 'Ticket updated successfully!',
        type: 'success'
      });
    } else {
      setToast({
        message: `Failed to update ticket: ${error.message}`,
        type: 'error'
      });
    }
  };

  // Delete ticket
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    
    setLoading(true);
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    setLoading(false);
    
    if (!error) {
      fetchTickets();
      setToast({
        message: 'Ticket deleted successfully!',
        type: 'success'
      });
    } else {
      setToast({
        message: `Failed to delete ticket: ${error.message}`,
        type: 'error'
      });
    }
  };

  // Track ticket
  const handleTrackTicket = async () => {
    const input = ticketNumberInput.trim();
    if (!input) {
      setTrackingError('Please enter a ticket number.');
      setTrackedTicket(null);
      return;
    }
    
    setLoading(true);
    const found = tickets.find((t) => t.ticket_number === input);
    setLoading(false);
    
    if (found) {
      setTrackedTicket(found);
      setTrackingError('');
      
      // Fetch chat messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ticket_number', input)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching chat messages:', error);
      } else {
        setUserMessages(data);
      }
    } else {
      setTrackedTicket(null);
      setTrackingError('Ticket not found. Please check the ticket number.');
      setUserMessages([]);
    }
  };

  // Open user chat
  const openUserChat = () => {
    if (!trackedTicket) return;
    setShowUserChat(true);
    setNewUserMessage('');
  };

  // Close user chat
  const closeUserChat = () => {
    if (userChatChannelRef.current) {
      supabase.removeChannel(userChatChannelRef.current);
    }
    setShowUserChat(false);
    setNewUserMessage('');
    setUserMessages([]);
  };

  // Send user message
  const sendUserMessage = async () => {
    if (!newUserMessage.trim() || !trackedTicket) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          ticket_number: trackedTicket.ticket_number,
          sender_type: 'user',
          message: newUserMessage
        }
      ]);

    if (error) {
      console.error('Error sending message:', error);
      setToast({
        message: `Failed to send message: ${error.message}`,
        type: 'error'
      });
    } else {
      setNewUserMessage('');
      // Refresh messages
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ticket_number', trackedTicket.ticket_number)
        .order('created_at', { ascending: true });
      setUserMessages(data);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userMessages]);

  // Listen for new messages
  useEffect(() => {
    if (!trackedTicket) return;

    // Remove previous channel if exists
    if (userChatChannelRef.current) {
      supabase.removeChannel(userChatChannelRef.current);
    }

    userChatChannelRef.current = supabase
      .channel(`user-chat-${trackedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_number=eq.${trackedTicket.ticket_number}`
        },
        async (payload) => {
          // Only update if it's not our own message
          if (payload.new.sender_type !== 'user') {
            const { data } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('ticket_number', trackedTicket.ticket_number)
              .order('created_at', { ascending: true });
            setUserMessages(data);
          }
        }
      )
      .subscribe();

    return () => {
      if (userChatChannelRef.current) {
        supabase.removeChannel(userChatChannelRef.current);
      }
    };
  }, [trackedTicket]);

  // Post message
  const handlePostMessage = async () => {
    setLoading(true);
    await supabase.from('admin_messages').delete().neq('id', 0);
    const { error } = await supabase.from('admin_messages').insert([
      { message: adminMessage },
    ]);
    setLoading(false);
    
    if (!error) {
      setToast({
        message: 'Message posted to users!',
        type: 'success'
      });
    } else {
      setToast({
        message: `Failed to post message: ${error.message}`,
        type: 'error'
      });
    }
  };

  // Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const { email, password, code } = loginData;
    if (code !== generatedCode) {
      setToast({
        message: 'Invalid code. Please enter the correct 4-digit code.',
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) {
      setToast({
        message: `Login failed: ${error.message}`,
        type: 'error'
      });
      return;
    }
    setUser(data.user);
    setView('admin');
    
    setToast({
      message: 'Logged in successfully!',
      type: 'success'
    });
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
                aria-label="Back to home"
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
                  setToast({
                    message: 'Logged out successfully!',
                    type: 'info'
                  });
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                aria-label="Logout"
              >
                🔐 Logout
              </button>
            )}
            <button
              onClick={() => setShowTutorial(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              aria-label="Open tutorial"
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
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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

        {/* Toast Notifications */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
              <LoadingSpinner />
              <p className="mt-2 text-gray-600 dark:text-gray-300">Processing your request...</p>
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
                role="button"
                tabIndex="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setView('submit');
                  }
                }}
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
                role="button"
                tabIndex="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setView('track');
                  }
                }}
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
                role="button"
                tabIndex="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setView('adminLogin');
                  }
                }}
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Office Requesting</label>
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
                  <label className="block text-sm font-medium mb-2">Name of Requestee</label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Type of Repair</label>
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
                  <label className="block text-sm font-medium mb-2">Equipment Name</label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Priority Level</label>
                  <div className="flex space-x-4">
                    <label className={`flex items-center ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                      <input
                        type="radio"
                        value="NORMAL"
                        checked={formData.priority === 'NORMAL'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="font-medium">NORMAL</span>
                    </label>
                    <label className={`flex items-center ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                      <input
                        type="radio"
                        value="RUSH"
                        checked={formData.priority === 'RUSH'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="mr-2 h-4 w-4 text-red-600"
                      />
                      <span className="font-medium text-red-600">RUSH</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Problem Description</label>
                <textarea
                  rows={5}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  required
                  className={`w-full border rounded-lg p-3 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Please describe the issue in detail..."
                />
              </div>

              {/* Verification Code */}
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                  🔐 Enter Verification Code
                </h3>
                <p className="text-sm mb-3 text-gray-500">
                  Confirm submission by entering the code below.
                </p>
                <div className="mb-3 text-3xl font-bold tracking-widest bg-white text-blue-600 rounded-lg px-6 py-3 inline-block">
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
                disabled={loading}
                className={`w-full ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-4 px-6 rounded-lg text-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Processing...
                  </>
                ) : (
                  '🚀 Submit Ticket'
                )}
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
                disabled={loading}
                className={`${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-3 px-6 rounded-lg w-full transition flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Finding...
                  </>
                ) : (
                  '🔍 Find Ticket'
                )}
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
                    <p><span className="font-medium">Status:</span> <StatusBadge status={trackedTicket.status} /></p>
                    <p><span className="font-medium">👨‍🔧 Technician:</span> {trackedTicket.technician || 'Not assigned yet'}</p>
                    <p><span className="font-medium">📅 Scheduled Date:</span> 
                      {trackedTicket.scheduled_date
                        ? new Date(trackedTicket.scheduled_date).toLocaleDateString()
                        : 'Not scheduled yet'}
                    </p>
                    <p><span className="font-medium">⚡ Priority:</span> <PriorityIndicator priority={trackedTicket.priority} /></p>
                  </div>
                  
                  {/* Chat Button */}
                  <div className="mt-6">
                    <button
                      onClick={openUserChat}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                    >
                      💬 Open Chat
                    </button>
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
                disabled={loading}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Logging in...
                  </>
                ) : (
                  '🔓 Log In'
                )}
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
                  setToast({
                    message: 'Please agree to proceed.',
                    type: 'warning'
                  });
                  return;
                }
                setShowModal(false);
                setView('home');
                setToast({
                  message: 'Redirecting to Google Form...',
                  type: 'info'
                });
                setTimeout(() => {
                  window.location.href =
                    'https://docs.google.com/forms/d/e/1FAIpQLSeS_9axdB3it0MbZ1LrZnKfdVrro7p2x9ZqBslcj6W_h2UAMw/viewform';
                }, 1500);
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

      {/* ✅ USER CHAT WINDOW */}
      {showUserChat && trackedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } w-full max-w-lg h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-500">
                  Chat with Support
                </h3>
                <p className="text-sm text-gray-400">Ticket: #{trackedTicket.ticket_number}</p>
              </div>
              <button
                onClick={closeUserChat}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full transition hover:bg-gray-700"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50"
              style={{ maxHeight: 'calc(80vh - 160px)' }}
            >
              {userMessages.length === 0 ? (
                <p className="text-center text-gray-500 mt-4">No messages yet. Say hello!</p>
              ) : (
                userMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newUserMessage}
                  onChange={(e) => setNewUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                  placeholder="Type your message..."
                  className={`flex-1 border rounded-lg px-3 py-2 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  onClick={sendUserMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Send
                </button>
              </div>
            </div>
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

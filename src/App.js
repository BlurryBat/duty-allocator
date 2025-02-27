import React, {useEffect, useState} from "react";
import {Route, Routes, useLocation} from "react-router-dom";

// Load Roboto font (for demonstration):
const robotoFontLink = document.createElement("link");
robotoFontLink.rel = "stylesheet";
robotoFontLink.href = "https://fonts.googleapis.com/css2?family=Roboto&display=swap";
document.head.appendChild(robotoFontLink);

/** Utility: get #days in (year, month) => month=1..12 */
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/** Utility: weekday of 1st => 0=Sun..6=Sat */
function getFirstWeekday(year, month) {
    return new Date(year, month - 1, 1).getDay();
}

// Month names
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * MAIN APP with 2 routes:
 *  - "/" => Interactive Allocator
 *  - "/share" => Read-only summary
 */
export default function App() {
    return (
        <>
            <GlobalStyles/>
            <Routes>
                <Route path="/" element={<AllocatorPage/>}/>
                <Route path="/share" element={<SharePage/>}/>
            </Routes>
        </>

    );
}

/** The interactive Duty Allocator page ("/") */
function AllocatorPage() {
    // --------------------------
    // 1) State
    // --------------------------
    const [year, setYear] = useState(2025);
    const [month, setMonth] = useState(3);
    const [totalDays, setTotalDays] = useState(31);
    const [people, setPeople] = useState([
        "Deeksha",
        "Isha",
        "Pratheek",
        "Dhanush",
        "Annapoorna",
        "Shreshta",
        "Sushruth",
        "Nikhitha"
    ]);
    const [days, setDays] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        dayNum: 0,
        slots: 2,
        fixed: [null, null],
        forbidden: []
    });

    // 3) If year or month changes, rebuild
    useEffect(() => {
        buildDays();
        // eslint-disable-next-line
    }, [year, month]);

    function buildDays() {
        const dCount = getDaysInMonth(year, month);
        setTotalDays(dCount);
        const arr = [];
        for (let d = 1; d <= dCount; d++) {
            arr[d] = {
                slots: 2,
                fixed: [null, null],
                forbidden: [],
                assigned: []
            };
        }
        setDays(arr);
    }

    // 4) People
    function addPerson(name) {
        name = name.trim();
        if (name && !people.includes(name)) {
            setPeople([...people, name]);
        }
    }

    function removePerson(name) {
        setPeople(people.filter((p) => p !== name));
        const copy = days.slice();
        for (let d = 1; d < copy.length; d++) {
            if (!copy[d]) continue;
            if (copy[d].fixed[0] === name) copy[d].fixed[0] = null;
            if (copy[d].fixed[1] === name) copy[d].fixed[1] = null;
            copy[d].forbidden = copy[d].forbidden.filter((f) => f !== name);
        }
        setDays(copy);
    }

    // 5) Allocate
    function allocateDuties() {
        if (!days || days.length < 2) return;
        const copy = days.map((obj) => {
            if (!obj) return null;
            return {...obj, assigned: new Array(obj.slots).fill(null)};
        });
        const usageCount = {};
        people.forEach((p) => {
            usageCount[p] = 0;
        });
        for (let d = 1; d < copy.length; d++) {
            const prevDay = d > 1 ? copy[d - 1] : null;
            for (let slot = 0; slot < copy[d].slots; slot++) {
                const fixedP = copy[d].fixed[slot];
                if (fixedP) {
                    if (!isFeasible(fixedP, copy[d], slot, prevDay)) continue;
                    copy[d].assigned[slot] = fixedP;
                    usageCount[fixedP]++;
                } else {
                    const feasible = people.filter((p) => isFeasible(p, copy[d], slot, prevDay));
                    if (feasible.length === 0) continue;
                    let minU = Math.min(...feasible.map((pp) => usageCount[pp]));
                    let cands = feasible.filter((pp) => usageCount[pp] === minU);
                    let chosen = cands[Math.floor(Math.random() * cands.length)];
                    copy[d].assigned[slot] = chosen;
                    usageCount[chosen]++;
                }
            }
        }
        setDays(copy);
    }

    function isFeasible(person, dayObj, slotIndex, prevDay) {
        if (dayObj.forbidden.includes(person)) return false;
        if (dayObj.assigned.includes(person)) return false;
        if (prevDay && prevDay.assigned.includes(person)) return false;
        return true;
    }

    // 6) Day modal
    function openDayModal(d) {
        if (!days[d]) return;
        setModalData({
            dayNum: d,
            slots: days[d].slots,
            fixed: [...days[d].fixed],
            forbidden: [...days[d].forbidden]
        });
        setModalOpen(true);
    }

    function closeDayModal() {
        setModalOpen(false);
    }

    function saveDayModal() {
        const copy = days.slice();
        const d = modalData.dayNum;
        copy[d] = {
            ...copy[d],
            slots: modalData.slots,
            fixed: [...modalData.fixed],
            forbidden: [...modalData.forbidden],
            assigned: []
        };
        setDays(copy);
        setModalOpen(false);
    }

    // 7) Stats
    const {usageCount, singleCount} = computeDutyStats(people, days);

    // 8) SHARE => copy to clipboard
    function handleShare() {
        const obj = {people, days, year, month};
        const json = JSON.stringify(obj);
        const encoded = encodeURIComponent(json);
        const shareUrl = `${window.location.href}/#/share?config=${encoded}`;
        navigator.clipboard
            .writeText(shareUrl)
            .then(() => alert(`Copied share URL:\n${shareUrl}`))
            .catch((err) => alert(`Failed to copy: ${err}`));
    }

    // **Define them HERE** so ESLint sees them
    function renderYearOptions() {
        const opts = [];
        for (let y = 2020; y <= 2030; y++) {
            opts.push(<option key={y} value={y}>{y}</option>);
        }
        return opts;
    }

    function renderMonthOptions() {
        return monthNames.map((mn, idx) => (
            <option key={mn} value={idx + 1}>{mn}</option>
        ));
    }

    return (
        <div className="app-container">
            <h1 className="title">Duty Allocator</h1>

            <div style={{margin: "10px 0"}}>
                <button onClick={handleShare}>Share</button>
            </div>

            {/* Month / Year */}
            <div style={{margin: "20px 0"}}>
                <label>
                    Year:{" "}
                    <select
                        value={year}
                        onChange={(e) => setYear(+e.target.value)}
                    >
                        {renderYearOptions()}
                    </select>
                </label>
                <label style={{marginLeft: "10px"}}>
                    Month:{" "}
                    <select
                        value={month}
                        onChange={(e) => setMonth(+e.target.value)}
                    >
                        {renderMonthOptions()}
                    </select>
                </label>
                <div style={{marginTop: "8px"}}>
                    {monthNames[month - 1]} {year} has {totalDays} days
                </div>
            </div>

            {/* People */}
            <PeopleManager people={people} onAdd={addPerson} onRemove={removePerson}/>

            {/* Calendar */}
            {days && days.length > 1 && (
                <>
                    <h2 className="subtitle">
                        Calendar for {monthNames[month - 1]} {year}
                    </h2>
                    <CalendarTable
                        year={year}
                        month={month}
                        days={days}
                        openDayModal={openDayModal}
                    />
                </>
            )}

            {/* Allocate */}
            <div style={{marginTop: "20px"}}>
                <button onClick={allocateDuties}>Allocate Duties</button>
            </div>

            {/* Duty Summary */}
            <h2 className="subtitle" style={{marginTop: "30px"}}>
                Duty Summary
            </h2>
            <DutySummaryTable people={people} usageCount={usageCount} singleCount={singleCount}/>

            {modalOpen && (
                <DayModal
                    modalData={modalData}
                    setModalData={setModalData}
                    people={people}
                    closeDayModal={closeDayModal}
                    saveDayModal={saveDayModal}
                />
            )}
        </div>
    );
}

/** The read-only page at "/share" */
function SharePage() {
    const loc = useLocation();
    const [loaded, setLoaded] = useState(false);

    const [year, setYear] = useState(2025);
    const [month, setMonth] = useState(3);
    const [people, setPeople] = useState([]);
    const [days, setDays] = useState([]);
    const [totalDays, setTotalDays] = useState(31);

    useEffect(() => {
        const params = new URLSearchParams(loc.search);
        const enc = params.get("config");
        if (!enc) return;
        try {
            const json = decodeURIComponent(enc);
            const obj = JSON.parse(json);
            if (obj.people && obj.days && obj.year && obj.month) {
                setPeople(obj.people);
                setDays(obj.days);
                setYear(obj.year);
                setMonth(obj.month);
                setTotalDays(getDaysInMonth(obj.year, obj.month));
                setLoaded(true);
            }
        } catch (err) {
            console.warn("Failed to parse share config:", err);
        }
    }, [loc.search]);

    const {usageCount, singleCount} = computeDutyStats(people, days);

    if (!loaded) {
        return (
            <div className="app-container">
                <h1 className="title">Duty Schedule</h1>
                <p>No valid config found in URL.</p>
            </div>
        );
    }

    return (
        <div className="app-container">
            <h1 className="title">Duty Schedule</h1>
            <p>
                {monthNames[month - 1]} {year} – {totalDays} days
            </p>

            <CalendarTableReadOnly year={year} month={month} days={days}/>

            <h2 className="subtitle" style={{marginTop: "30px"}}>
                Duty Summary
            </h2>
            <DutySummaryTable people={people} usageCount={usageCount} singleCount={singleCount}/>
        </div>
    );
}

/** People Manager */
function PeopleManager({people, onAdd, onRemove}) {
    const [inputVal, setInputVal] = useState("");

    function handleAdd() {
        onAdd(inputVal);
        setInputVal("");
    }

    return (
        <div className="people-manager">
            <h2 className="subtitle">People</h2>
            <div>
                <input
                    placeholder="Add person"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                />
                <button onClick={handleAdd} style={{marginLeft: "6px"}}>Add</button>
            </div>
            <ul className="people-list">
                {people.map((p) => (
                    <li key={p}>
                        {p}{" "}
                        <button onClick={() => onRemove(p)}>x</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Interactive Calendar for AllocatorPage */
function CalendarTable({year, month, days, openDayModal}) {
    const dCount = getDaysInMonth(year, month);
    const firstWkday = getFirstWeekday(year, month);

    const rows = [];
    let row = [];
    let dayCounter = 0;
    for (let i = 0; i < firstWkday; i++) {
        row.push(null);
        dayCounter++;
    }
    let d = 1;
    while (d <= dCount) {
        if (dayCounter > 6) {
            rows.push(row);
            row = [];
            dayCounter = 0;
        }
        row.push(d);
        d++;
        dayCounter++;
    }
    while (dayCounter <= 6) {
        row.push(null);
        dayCounter++;
    }
    rows.push(row);

    return (
        <table className="calendar-table">
            <thead>
            <tr>
                <th>Sun</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
            </tr>
            </thead>
            <tbody>
            {rows.map((r, i) => (
                <tr key={i}>
                    {r.map((dayNum, idx) => (
                        <td key={idx}>
                            {dayNum ?
                                <DayCell dayNum={dayNum} dayObj={days[dayNum]} openDayModal={openDayModal}/>
                                : null
                            }
                        </td>
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

function DayCell({dayNum, dayObj, openDayModal}) {
    const assigned = dayObj?.assigned || [];
    return (
        <div>
            <div
                className="day-label"
                onClick={() => openDayModal(dayNum)}
            >
                Day {dayNum}
            </div>
            <div className="assigned-list">
                {" "}
                {assigned.length > 0
                    ? assigned.map((a, i) => <div key={i}>{a || "-"}</div>)
                    : " -"
                }
            </div>
        </div>
    );
}

/** Read-only Calendar for /share page */
function CalendarTableReadOnly({year, month, days}) {
    const dCount = getDaysInMonth(year, month);
    const firstWkday = getFirstWeekday(year, month);

    const rows = [];
    let row = [];
    let dayCounter = 0;
    for (let i = 0; i < firstWkday; i++) {
        row.push(null);
        dayCounter++;
    }
    let d = 1;
    while (d <= dCount) {
        if (dayCounter > 6) {
            rows.push(row);
            row = [];
            dayCounter = 0;
        }
        row.push(d);
        d++;
        dayCounter++;
    }
    while (dayCounter <= 6) {
        row.push(null);
        dayCounter++;
    }
    rows.push(row);

    return (
        <table className="calendar-table read-only">
            <thead>
            <tr>
                <th>Sun</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
            </tr>
            </thead>
            <tbody>
            {rows.map((r, i) => (
                <tr key={i}>
                    {r.map((dayNum, idx) => (
                        <td key={idx}>
                            {dayNum
                                ? <ReadOnlyDayCell dayNum={dayNum} dayObj={days[dayNum]}/>
                                : null
                            }
                        </td>
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

function ReadOnlyDayCell({dayNum, dayObj}) {
    const assigned = dayObj?.assigned || [];
    return (
        <div>
            <div className="day-label">
                Day {dayNum}
            </div>
            <div className="assigned-list">
                {" "}
                {assigned.length > 0
                    ? assigned.map((a, i) => <div key={i}>{a || "-"}</div>)
                    : " -"
                }
            </div>
        </div>
    );
}

/** The Day Modal for editing a single day. */
function DayModal({modalData, setModalData, people, closeDayModal, saveDayModal}) {
    const {dayNum, slots, fixed, forbidden} = modalData;

    function handleSlots(e) {
        const val = parseInt(e.target.value);
        const copy = {...modalData, slots: val};
        if (val === 1) copy.fixed[1] = null;
        setModalData(copy);
    }

    function handleFixed(slotIndex, person) {
        const copy = {...modalData};
        copy.fixed[slotIndex] = person === "" ? null : person;
        setModalData(copy);
    }

    function addForbidden(name) {
        if (!forbidden.includes(name)) {
            const copy = {...modalData};
            copy.forbidden = [...forbidden, name];
            setModalData(copy);
        }
    }

    function removeForbidden(name) {
        const copy = {...modalData};
        copy.forbidden = copy.forbidden.filter((f) => f !== name);
        setModalData(copy);
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Day {dayNum}</h2>

                <div style={{margin: "10px 0"}}>
                    <label style={{marginRight: "10px"}}>
                        <input
                            type="radio"
                            name="slotCount"
                            value={1}
                            checked={slots === 1}
                            onChange={handleSlots}
                        />
                        1 Slot
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="slotCount"
                            value={2}
                            checked={slots === 2}
                            onChange={handleSlots}
                        />
                        2 Slots
                    </label>
                </div>

                {/* Fixed persons */}
                <div style={{margin: "6px 0"}}>
                    Slot 1:{" "}
                    <select
                        value={fixed[0] || ""}
                        onChange={(e) => handleFixed(0, e.target.value)}
                    >
                        <option value="">(None)</option>
                        {people.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                {slots === 2 && (
                    <div style={{margin: "6px 0"}}>
                        Slot 2:{" "}
                        <select
                            value={fixed[1] || ""}
                            onChange={(e) => handleFixed(1, e.target.value)}
                        >
                            <option value="">(None)</option>
                            {people.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Forbidden */}
                <div style={{marginTop: "10px"}}>
                    <div style={{marginBottom: "6px"}}>Forbidden People:</div>
                    <div>
                        {forbidden.map((f) => (
                            <span key={f} style={{
                                display: "inline-block",
                                background: "#eee",
                                margin: "3px",
                                padding: "2px 6px",
                                borderRadius: "4px"
                            }}>
                {f}
                                <button
                                    style={{
                                        border: "none",
                                        background: "none",
                                        marginLeft: "4px",
                                        cursor: "pointer",
                                        color: "#c33"
                                    }}
                                    onClick={() => removeForbidden(f)}
                                >
                  x
                </button>
              </span>
                        ))}
                    </div>
                    <div style={{marginTop: "8px"}}>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    addForbidden(e.target.value);
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">(Add person)</option>
                            {people.map((p) =>
                                <option key={p} value={p}>{p}</option>
                            )}
                        </select>
                    </div>
                </div>

                <div style={{marginTop: "20px"}}>
                    <button onClick={saveDayModal} style={{marginRight: "8px"}}>
                        Save
                    </button>
                    <button onClick={closeDayModal}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

/** DutySummaryTable => total + single duties */
function DutySummaryTable({people, usageCount, singleCount}) {
    return (
        <table className="duty-summary">
            <thead>
            <tr>
                <th>Person</th>
                <th>Total Duties</th>
                <th>Single-Person</th>
            </tr>
            </thead>
            <tbody>
            {people.map((p) => (
                <tr key={p}>
                    <td>{p}</td>
                    <td>{usageCount[p] || 0}</td>
                    <td>{singleCount[p] || 0}</td>
                </tr>
            ))}
            </tbody>
        </table>
    );
}

/** compute total + single duties for each person */
function computeDutyStats(people, days) {
    const usageCount = {};
    const singleCount = {};
    people.forEach((p) => {
        usageCount[p] = 0;
        singleCount[p] = 0;
    });
    if (!days || days.length === 0) return {usageCount, singleCount};

    for (let d = 1; d < days.length; d++) {
        const day = days[d];
        if (!day) continue;
        const {slots, assigned} = day;
        if (assigned) {
            for (let i = 0; i < assigned.length; i++) {
                const person = assigned[i];
                if (person) {
                    usageCount[person]++;
                    if (slots === 1) {
                        singleCount[person]++;
                    }
                }
            }
        }
    }
    return {usageCount, singleCount};
}

/** GlobalStyles => Roboto, responsive table, etc. */
function GlobalStyles() {
    return (
        <style>
            {`
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Roboto', sans-serif;
      }
      .app-container {
        text-align: center;
        font-size: 18px;
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }
      .title {
        font-size: 28px;
        margin-top: 20px;
      }
      .subtitle {
        font-size: 22px;
        margin-top: 20px;
      }
      .people-manager {
        border: 1px solid #ccc;
        display: inline-block;
        padding: 16px;
        margin-bottom: 20px;
      }
      .people-list {
        list-style: none;
        padding: 0;
        margin-top: 10px;
        text-align: center;
      }
      .people-list li {
        display: inline-block;
        background: #eee;
        margin: 4px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .calendar-table {
        margin: 0 auto;
        border-collapse: collapse;
        width: 100%;
        max-width: 800px;
        font-size: 16px;
      }
      .calendar-table th,
      .calendar-table td {
        border: 1px solid #ccc;
        padding: 4px;
        vertical-align: top;
        width: 14%;
      }
      /* responsive for small screens */
      @media (max-width: 600px) {
        .calendar-table {
          font-size: 14px;
        }
        .calendar-table th,
        .calendar-table td {
          padding: 2px;
        }
      }

      .day-label {
        font-weight: bold;
        cursor: pointer;
        text-decoration: underline;
      }
      .assigned-list {
        margin-top: 4px;
        font-size: 14px;
      }
      .duty-summary {
        margin: 0 auto;
        border-collapse: collapse;
        margin-top: 10px;
        width: 100%;
        max-width: 600px;
      }
      .duty-summary th, .duty-summary td {
        border: 1px solid #ccc;
        padding: 6px 12px;
        text-align: center;
      }
      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .modal-content {
        background: #fff;
        padding: 20px;
        border-radius: 6px;
        width: 400px;
        text-align: center;
      }
      `}
        </style>
    );
}
